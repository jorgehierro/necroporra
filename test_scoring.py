"""
test_scoring.py - Pruebas unitarias para el sistema de puntuación de la necroporra.
"""

from scoring import calculate_base_points, calculate_points_breakdown


def test_base_points():
    assert calculate_base_points(95) == 5
    assert calculate_base_points(75) == 25
    assert calculate_base_points(50) == 50
    assert calculate_base_points(99) == 1
    assert calculate_base_points(100) == 1
    assert calculate_base_points(105) == 1


def test_captain_multiplier():
    # 80 años -> base = 20. Capitán x2 -> 40 pts
    res = calculate_points_breakdown(age_at_death=80, is_captain=True)
    assert res["base_points"] == 20
    assert res["captain_points"] == 20
    assert res["total_points"] == 40


def test_bonuses():
    # 40 años -> base = 60, youth bonus = +15, first blood = +10, exclusive = +10
    res = calculate_points_breakdown(
        age_at_death=40,
        is_captain=False,
        is_exclusive=True,
        is_first_blood=True,
    )
    assert res["base_points"] == 60
    assert res["bonus_youth"] == 15
    assert res["bonus_first_blood"] == 10
    assert res["bonus_exclusive"] == 10
    assert res["total_points"] == 60 + 15 + 10 + 10  # 95


def test_centenarian_bonus():
    # 102 años -> base = 1, centenarian bonus = +5
    res = calculate_points_breakdown(age_at_death=102)
    assert res["base_points"] == 1
    assert res["bonus_centenarian"] == 5
    assert res["total_points"] == 6


if __name__ == "__main__":
    test_base_points()
    test_captain_multiplier()
    test_bonuses()
    test_centenarian_bonus()
    print("¡Todas las pruebas de scoring pasaron exitosamente!")
