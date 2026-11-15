import { expect, test, type Page } from "@playwright/test";
import { CHAPTERS } from "../lib/walkthrough";

async function seek(page: Page, value: number) {
  await page.getByLabel("Animation timeline").evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(element, String(next));
    element.dispatchEvent(new Event("input", {bubbles:true}));
    element.dispatchEvent(new Event("change", {bubbles:true}));
  }, value);
  await expect(page.getByLabel("Animation timeline")).toHaveValue(String(value));
}

test("six visual chapters synchronize reasoning, equations, and independent lesson steps", async ({page}) => {
  await page.goto("/studio");
  const scene = page.getByTestId("lesson-scene");
  for (const [index, name] of CHAPTERS.entries()) {
    const chapter = page.getByRole("button", {name: `Visual chapter ${index+1}: ${name}`, exact:true});
    await chapter.click();
    await expect(chapter).toHaveAttribute("aria-current", "step");
    await expect(scene).toHaveAttribute("data-chapter", String(index));
    await expect(page.getByTestId("visual-reasoning")).toContainText(`VISUAL STEP ${index+1} / 6`);
    await expect(page.getByTestId("visual-reasoning").locator("math")).toBeVisible();
  }
  for (const [number, chapter] of [[1,1],[2,3],[3,4]]) {
    await page.getByTestId(`lesson-step-${number}`).click();
    await expect(scene).toHaveAttribute("data-chapter", String(chapter));
    await expect(page.getByTestId(`lesson-step-${number}`)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".selected-explanation")).toContainText(await page.getByTestId(`lesson-step-${number}`).locator(".step-copy > span").innerText());
  }
  await page.getByRole("button", {name:"Visual chapter 4: Motion",exact:true}).click();
  await expect(page.getByTestId("lesson-step-3")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".selected-explanation math")).toHaveAttribute("aria-label", /Flight time/);
  await seek(page, .999);
  await page.getByRole('button',{name:'Play animation',exact:true}).click();
  await expect(page.getByLabel('Animation timeline')).toHaveValue('1');
  await expect(scene).toHaveAttribute('data-chapter','5');
  await expect(page.getByRole('button',{name:'Play animation',exact:true})).toBeVisible();
});

test("attached velocity vectors have constant vx, zero vy at apex, reversed vy on descent and downward gravity", async ({page}) => {
  await page.goto("/studio?question=Explain%20velocity%20components");
  const scene = page.getByTestId("lesson-scene");
  await expect(scene).toHaveAttribute("data-scene","components");
  const svg = scene.locator(".scene-canvas > svg");
  const vectors: {dx:number;dy:number;x:number;y:number;vx:number;vy:number}[] = [];
  for (const value of [.47,.56,.65]) {
    await seek(page,value);
    vectors.push(await svg.evaluate(element => {
      const vx=element.querySelector('[data-testid="vx-vector"]')!, vy=element.querySelector('[data-testid="vy-vector"]')!;
      const n=(el:Element,key:string)=>Number(el.getAttribute(key));
      const ball=element.querySelector('[data-testid="component-ball"]')!;
      return {dx:n(vx,'x2')-n(vx,'x1'),dy:n(vy,'y2')-n(vy,'y1'),x:n(ball,'cx'),y:n(ball,'cy'),vx:n(element,'data-vx'),vy:n(element,'data-vy')};
    }));
  }
  expect(vectors[0].dx).toBeCloseTo(vectors[1].dx,8);
  expect(vectors[0].dx).toBeCloseTo(vectors[2].dx,8);
  expect(vectors[0].dy).toBeLessThan(0); expect(vectors[1].dy).toBeCloseTo(0,8); expect(vectors[2].dy).toBeGreaterThan(0);
  expect(vectors[0].dy / vectors[0].dx).toBeCloseTo(-.5, 8);
  expect(vectors[2].dy / vectors[2].dx).toBeCloseTo(.5, 8);
  expect(vectors[0].vx).toBeCloseTo(14.14213562,7);
  expect(vectors[0].vy).toBeGreaterThan(0); expect(vectors[2].vy).toBeLessThan(0);
  expect(vectors[2].x).toBeGreaterThan(vectors[0].x);
  expect(vectors[1].y).toBeLessThan(vectors[0].y);
  const gravity=page.getByTestId('gravity-vector');
  expect(Number(await gravity.getAttribute('y2'))).toBeGreaterThan(Number(await gravity.getAttribute('y1')));
  await seek(page,1);
  await expect(page.getByTestId('vx-vector')).toHaveCount(0);
  await expect(svg).toContainText('At landing');
});

test("parameter changes update component readings while keeping the paused visual chapter", async ({page}) => {
  await page.goto("/studio?question=Explain%20velocity%20components");
  await page.getByTestId('lesson-step-1').click();
  await expect(page.getByTestId('vx-readout')).toContainText('14.14');
  await page.getByRole('button',{name:'60°',exact:true}).click();
  await expect(page.getByTestId('vx-readout')).toContainText('10.00');
  await expect(page.getByTestId('vy-readout')).toContainText('17.32');
  await expect(page.getByLabel('Animation timeline')).toHaveValue('0.16');
  await expect(page.getByTestId('visual-reasoning')).toContainText('10.00 m/s');
  await expect(page.getByRole('button',{name:'Play animation',exact:true})).toBeVisible();
});

test("angle evidence and distance bars explain equal ranges through speed and airtime", async ({page}) => {
  await page.goto('/studio');
  await expect(page.getByTestId('angle-evidence-30')).toContainText('35.31 m');
  await expect(page.getByTestId('angle-evidence-60')).toContainText('35.31 m');
  await expect(page.getByTestId('angle-evidence-45')).toContainText('40.77 m');
  await page.getByTestId('lesson-step-2').click();
  await page.getByLabel('What feels unclear about step 2?').fill("Why doesn't 60 degrees travel farther if it stays in the air longer?");
  await page.getByRole('button',{name:'Explain it differently'}).click();
  await expect(page.getByTestId('lesson-scene')).toHaveAttribute('data-scene','components');
  await page.getByLabel('Gravity is stronger at a higher angle.',{exact:true}).check();
  await page.getByRole('button',{name:'Check my understanding'}).click();
  await page.getByRole('button',{name:'Try another visual'}).click();
  await expect(page.getByTestId('lesson-scene')).toHaveAttribute('data-scene','range_comparison');
  await seek(page,.47);
  const width=async(angle:number)=>Number(await page.getByTestId(`distance-bar-${angle}`).getAttribute('width'));
  expect(await width(30)).toBeGreaterThan(await width(60));
  await seek(page,1);
  expect(await width(30)).toBeCloseTo(await width(60),8);
  expect(await width(45)).toBeGreaterThan(await width(60));
});

test("pending live requests show a truthful neutral workspace and failures preserve input", async ({page}) => {
  await page.goto('/studio');
  await expect(page.getByTestId('lesson-scene')).toBeVisible();
  await page.getByRole('button',{name:'New lesson',exact:true}).click();
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/lesson',async route=>{await gate; await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({detail:{message:'Gemini returned a plan that could not be validated.'}})});});
  try {
    await page.getByLabel('Lesson generation mode').selectOption('gemini');
    await page.getByLabel('What would you like to understand?').fill('Explain projectile motion');
    await page.getByRole('button',{name:'Visualize',exact:true}).click();
    await expect(page.getByRole('region',{name:'Lesson workspace preparing'})).toBeVisible();
    await expect(page.getByRole('status')).toContainText('waiting for a validated plan');
    await expect(page.getByTestId('lesson-scene')).toHaveCount(0);
    await expect(page.getByTestId('lesson-mode')).toHaveCount(0);
  } finally {release();}
  await expect(page.locator('.error-banner')).toContainText('could not be validated');
  await expect(page.getByLabel('What would you like to understand?')).toHaveValue('Explain projectile motion');
  await expect(page.getByRole('button',{name:'Use Demo mode for the next lesson'})).toBeVisible();
});

test("optional health refresh does not hold a completed lesson busy", async ({page}) => {
  await page.goto('/studio');
  await expect(page.getByTestId('lesson-scene')).toBeVisible();
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let healthRequested=false;
  await page.route('**/health',async route=>{healthRequested=true;await gate;await route.continue();});
  try {
    await page.getByRole('button',{name:'Visualize',exact:true}).click();
    await expect.poll(()=>healthRequested).toBe(true);
    await expect(page.getByRole('button',{name:'Visualize',exact:true})).toBeEnabled();
    await expect(page.locator('.loading-status')).toHaveCount(0);
    await expect(page.getByTestId('visual-reasoning')).toBeVisible();
  } finally { release(); }
});

test("cached Gemini provenance is separate from the mode label", async ({page,request}) => {
  const session=crypto.randomUUID();
  const response=await request.post('http://127.0.0.1:8000/api/lesson',{data:{session_id:session,question:'Explain projectile motion',mode:'demo'}});
  expect(response.status()).toBe(200);
  const lesson=await response.json();
  await page.goto('/studio');
  await expect(page.getByTestId('lesson-scene')).toBeVisible();
  await page.route('**/api/lesson',route=>route.fulfill({json:{...lesson,mode:'gemini',planning_source:'gemini_cache'}}));
  await page.getByLabel('Lesson generation mode').selectOption('gemini');
  await page.getByRole('button',{name:'Visualize',exact:true}).click();
  await expect(page.getByTestId('lesson-mode')).toHaveText('Gemini lesson');
  await expect(page.getByTestId('planning-source')).toContainText('Saved Gemini plan');
});

test("a maximum-height step seeks the actual apex even from a range lesson", async ({page,request}) => {
  const response=await request.post('http://127.0.0.1:8000/api/lesson',{data:{session_id:crypto.randomUUID(),question:'Explain projectile motion',mode:'demo'}});
  expect(response.status()).toBe(200);
  const lesson=await response.json();
  lesson.scene='range_comparison';
  lesson.steps[1]={...lesson.steps[1],title:'Inspect the apex',text:'At maximum height vertical velocity is zero, while gravity still acts downward.',equation_key:'height'};
  await page.route('**/api/lesson',route=>route.fulfill({json:lesson}));
  await page.goto('/studio');
  await page.getByTestId('lesson-step-2').click();
  await expect(page.getByTestId('lesson-scene')).toHaveAttribute('data-chapter','3');
  await expect(page.getByRole('img',{name:/Velocity components during projectile flight/})).toBeVisible();
  await expect(page.getByTestId('vy-readout')).toContainText('0.00');
  await expect(page.locator('.selected-explanation math')).toHaveAttribute('aria-label',/Maximum height/);
});

test("a new unsupported question never opens an unrelated physics animation", async ({page}) => {
  await page.goto('/studio');
  await expect(page.getByTestId('lesson-scene')).toBeVisible();
  await page.getByRole('button',{name:'New lesson',exact:true}).click();
  await page.getByLabel('What would you like to understand?').fill('Explain photosynthesis');
  await page.getByRole('button',{name:'Visualize',exact:true}).click();
  await expect(page.locator('.error-banner')).toContainText('supports ideal');
  await expect(page.getByTestId('lesson-scene')).toHaveCount(0);
  await expect(page.getByLabel('What would you like to understand?')).toHaveValue('Explain photosynthesis');
});
