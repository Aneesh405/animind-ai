from uuid import uuid4
import pytest
from pydantic import ValidationError
from visual_learning import VisualRequest, VisualPlan, route, visual_lesson

def request(question, subject='Mathematics', **kw):
    return VisualRequest(session_id=uuid4(),subject=subject,question=question,**kw)

def test_routing():
    assert route(request('Explain a linear function')) == 'linear_function'
    assert route(request('Graph a quadratic function')) == 'quadratic_function'
    assert route(request('Explain integration')) is None
    assert route(request('What is sodium chloride?', 'Chemistry')) is None

def test_parameters():
    plan=visual_lesson(request('Explain a quadratic function'))
    assert plan.parameters == {'a':1,'b':0,'c':0}
    for values in ({'a':float('nan')}, {'a':7}, {'unknown':3}):
        with pytest.raises(ValidationError):
            VisualPlan(**(plan.model_dump() | {'parameters':values}))

def test_unsupported():
    assert visual_lesson(request('Explain integration')).concept is None

def test_invalid_gemini(monkeypatch):
    from fastapi import HTTPException
    def invalid(*args, **kwargs): raise HTTPException(502,'invalid plan')
    monkeypatch.setattr('visual_learning.generate_plan',invalid)
    assert visual_lesson(request('Explain a linear function',mode='gemini')).concept is None

@pytest.mark.parametrize('question,concept', [('Explain a simple pendulum','simple_pendulum'), ("Explain Newton's second law",'newtons_second_law')])
def test_physics_models(question, concept):
    plan = visual_lesson(request(question,'Physics'))
    assert plan.concept == concept
    assert plan.parameters

@pytest.mark.parametrize('subject,question,concept', [
    ('Chemistry','Explain the water molecule','water_molecule'),
    ('Biology','Explain an animal cell','animal_cell'),
    ('Computer Science','Explain bubble sort','bubble_sort'),
])
def test_other_subjects(subject,question,concept):
    plan=visual_lesson(request(question,subject))
    assert plan.concept==concept
    assert len(plan.steps)>=2

def test_bounded_sort():
    from visual_learning import Bubble
    assert Bubble().values == [5,1,4,2,8]
    for values in ([1], list(range(13)), [1,100]):
        with pytest.raises(ValidationError): Bubble(values=values)

def test_api_and_subject_mismatch():
    from main import app
    from fastapi.testclient import TestClient
    client=TestClient(app)
    body=request('Explain a linear function').model_dump(mode='json')
    response=client.post('/api/visual-lesson',json=body)
    assert response.status_code==200
    assert response.json()['parameters']=={'m':1,'b':0}
    assert client.post('/api/visual-lesson',json=body|{'concept':'animal_cell'}).status_code==422
    assert client.post('/api/visual-lesson',json=body|{'concept':'execute_code'}).status_code==422

def test_gemini_cache_and_mismatched_visual(monkeypatch):
    from visual_learning import visual_cache
    calls=[]
    req=request('Explain a linear function',mode='gemini')
    def generate(*args,**kwargs):
        calls.append(1)
        return VisualPlan(title='A written explanation',explanation='A line has constant slope and a fixed vertical intercept.',steps=['Identify the slope.','Identify the intercept.'],comprehension_question='What is the rate of change?',concept=None)
    monkeypatch.setattr('visual_learning.generate_plan',generate)
    assert visual_lesson(req).concept is None
    assert visual_lesson(req).concept is None
    assert len(calls)==1

def test_no_false_polynomial_or_double_pendulum():
    assert route(request('Graph y = x^3')) is None
    assert route(request('Explain a double pendulum','Physics')) is None
    assert route(request('Graph y = x^2')) == 'quadratic_function'

def test_maximum_question_length_is_safe():
    assert visual_lesson(request('a'*1500)).concept is None

def test_multisubject_real_sdk_serialization(monkeypatch):
    import json
    import httpx
    from google import genai
    from main import app
    from fastapi.testclient import TestClient
    monkeypatch.setenv('GEMINI_API_KEY','local-transport-test')
    monkeypatch.setenv('GEMINI_MODEL','gemini-3.8-flash')
    original=genai.Client
    payloads=[]
    output=visual_lesson(request('Explain a quadratic function')).model_dump()
    output['parameters']={'a':2,'b':-4,'c':1}
    def respond(req):
        payloads.append(json.loads(req.content))
        return httpx.Response(200,json={'candidates':[{'content':{'role':'model','parts':[{'text':json.dumps(output)}]},'finishReason':'STOP'}]})
    def local_client(**args):
        args['http_options'].httpx_client=httpx.Client(transport=httpx.MockTransport(respond))
        return original(**args)
    monkeypatch.setattr('teaching.genai.Client',local_client)
    body=request('Explain a quadratic function',mode='gemini').model_dump(mode='json')
    response=TestClient(app).post('/api/visual-lesson',json=body)
    assert response.status_code==200
    assert response.json()['parameters']=={'a':2,'b':-4,'c':1}
    assert payloads[0]['generationConfig']['responseJsonSchema']==VisualPlan.model_json_schema()
    assert 'multi-subject educator' in str(payloads[0]['systemInstruction'])

@pytest.mark.parametrize('concept,parameters', [
 ('simple_pendulum',{'length':0}),('simple_pendulum',{'angle':20}),
 ('simple_pendulum',{'gravity':-1}),('newtons_second_law',{'mass':0}),
 ('newtons_second_law',{'force':float('inf')}),('water_molecule',{'oxygen':2}),
 ('animal_cell',{'plant':1}),('bubble_sort',{'values':[100,1]}),
])
def test_all_visualizer_parameters_bounded(concept,parameters):
    with pytest.raises(ValidationError):
        VisualPlan(title='Invalid data',explanation='An explanatory paragraph.',steps=['First step','Second step'],comprehension_question='Can you explain?',concept=concept,parameters=parameters)

@pytest.mark.parametrize('payload', [
    'not json',
    '{"title":"Invented diagram","explanation":"An unrelated animation is requested.","steps":["First step","Second step"],"comprehension_question":"Can you explain?","concept":"benzene","parameters":{}}',
    '{"title":"Invalid quadratic","explanation":"A coefficient outside the supported bound.","steps":["First step","Second step"],"comprehension_question":"Can you explain?","concept":"quadratic_function","parameters":{"a":999}}',
])
def test_invalid_provider_output_falls_back(monkeypatch,payload):
    from unittest.mock import MagicMock
    monkeypatch.setenv('GEMINI_API_KEY','local-test')
    monkeypatch.setenv('GEMINI_MODEL','test-model')
    client=MagicMock()
    client.__enter__.return_value=client
    client.models.generate_content.return_value.text=payload
    monkeypatch.setattr('teaching.genai.Client',MagicMock(return_value=client))
    result=visual_lesson(request('Explain a quadratic function',mode='gemini'))
    assert result.concept is None
    assert result.parameters=={}
    assert 'written reference' in result.explanation

def test_blank_teaching_steps_are_invalid():
    with pytest.raises(ValidationError):
        VisualPlan(title='A lesson',explanation='A valid explanatory paragraph.',steps=['',''],comprehension_question='Can you explain?')

@pytest.mark.parametrize('subject,question', [
    ('Physics', 'Explain a damped simple pendulum'),
    ('Physics', 'Explain projectile motion with air resistance'),
    ('Physics', 'Explain F = mass times velocity'),
    ('Mathematics', 'Graph y = sin(x^2)'),
    ('Chemistry', 'Compare a water molecule and hydrogen peroxide'),
    ('Biology', 'Compare a plant cell and an animal cell'),
])
def test_complex_topics_do_not_select_simpler_models(subject, question):
    assert visual_lesson(request(question, subject)).concept is None


def test_projectile_route_does_not_duplicate_gemini_generation(monkeypatch):
    def unexpected(*args, **kwargs):
        pytest.fail('The established projectile API must generate this plan once.')
    monkeypatch.setattr('visual_learning.generate_plan', unexpected)
    plan = visual_lesson(request('Explain projectile motion', 'Physics', mode='gemini'))
    assert plan.concept == 'projectile_motion'


def test_ideal_projectile_assumptions_remain_supported():
    assert route(request('Explain projectile motion without air resistance', 'Physics')) == 'projectile_motion'
    assert route(request("Explain Newton's second law without friction", 'Physics')) == 'newtons_second_law'
