import pytest
from pydantic import ValidationError

from physics import calculate, verify_formulas
from schemas import Parameters


def test_symbolic_verification():
    assert verify_formulas()


def test_45_degrees_is_global_maximum():
    parameters = Parameters()
    maximum = calculate(parameters, 45).range
    for angle in range(91):
        assert calculate(parameters, angle).range <= maximum + 1e-7


@pytest.mark.parametrize("angle", [0, 10, 20, 30, 40, 45, 60, 80, 90])
def test_complementary_angles_have_equal_range(angle):
    assert calculate(Parameters(), angle).range == pytest.approx(calculate(Parameters(), 90 - angle).range, abs=1e-7)


def test_gravity_and_speed_relationships():
    baseline = calculate(Parameters())
    doubled_gravity = calculate(Parameters(gravity=19.62))
    doubled_speed = calculate(Parameters(speed=40))
    assert doubled_gravity.range == pytest.approx(baseline.range / 2)
    assert doubled_gravity.flight_time == pytest.approx(baseline.flight_time / 2)
    assert doubled_speed.range == pytest.approx(baseline.range * 4)
    assert doubled_speed.flight_time == pytest.approx(baseline.flight_time * 2)


def test_distance_equals_horizontal_speed_times_time():
    result = calculate(Parameters(angle=60))
    assert result.range == pytest.approx(result.horizontal_velocity * result.flight_time)


def test_ground_level_horizontal_and_vertical_launches():
    horizontal = calculate(Parameters(angle=0))
    vertical = calculate(Parameters(angle=90))
    assert horizontal.flight_time == 0
    assert horizontal.range == 0
    assert horizontal.max_height == 0
    assert vertical.range == pytest.approx(0)
    assert vertical.max_height > 0


@pytest.mark.parametrize("value", [0, -1, float("nan"), float("inf")])
def test_invalid_gravity(value):
    with pytest.raises(ValidationError):
        Parameters(gravity=value)
