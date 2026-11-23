"""
scoring.py - Motor de puntuación y cálculo de bonificaciones para la Necroporra.
"""

from typing import Dict, Any


def calculate_base_points(age_at_death: int) -> int:
    """
    Calcula los puntos base según la edad al fallecer.
    Fórmula: max(1, 100 - edad)
    - Alguien de 95 años otorga: 100 - 95 = 5 puntos
    - Alguien de 75 años otorga: 100 - 75 = 25 puntos
    - Alguien de 45 años otorga: 100 - 45 = 55 puntos
    - Alguien centenario (>=100 años) tiene un mínimo de 1 punto base.
    """
    if age_at_death < 0:
        age_at_death = 0
    return max(1, 100 - age_at_death)


def calculate_points_breakdown(
    age_at_death: int,
    is_captain: bool = False,
    is_exclusive: bool = False,
    is_first_blood: bool = False,
    captain_multiplier: float = 2.0,
    exclusive_bonus: int = 10,
    first_blood_bonus: int = 10,
    youth_bonus: int = 15,
    youth_age_threshold: int = 55,
    centenarian_bonus: int = 5,
) -> Dict[str, Any]:
    """
    Calcula el desglose completo de puntos para una apuesta acertada.

    Parámetros:
    - age_at_death: Edad del fallecido en el momento de la defunción.
    - is_captain: Si el usuario eligió a este candidato como su Capitán / Comodín.
    - is_exclusive: Si sólo este usuario tenía a este candidato en su lista de la edición.
    - is_first_blood: Si es el primer fallecimiento acertado en el año/edición.
    - captain_multiplier: Multiplicador para el capitán (por defecto x2).
    - exclusive_bonus: Puntos extra por acierto exclusivo (+10).
    - first_blood_bonus: Puntos extra por el primer acierto del año (+10).
    - youth_bonus: Puntos extra por edad < youth_age_threshold (+15).
    - centenarian_bonus: Puntos extra por edad >= 100 (+5).

    Retorna un diccionario con el detalle de cada concepto y los puntos totales.
    """
    base_points = calculate_base_points(age_at_death)

    # Multiplicador de capitán sobre los puntos base
    if is_captain:
        captain_points = int(base_points * (captain_multiplier - 1.0))
    else:
        captain_points = 0

    # Bonificación por exclusividad
    bonus_exclusive = exclusive_bonus if is_exclusive else 0

    # Bonificación por primer fallecimiento del año
    bonus_first_blood = first_blood_bonus if is_first_blood else 0

    # Bonificación por muerte prematura/juventud (< 55 años)
    bonus_youth = youth_bonus if age_at_death < youth_age_threshold else 0

    # Bonificación centenario (>= 100 años)
    bonus_centenarian = centenarian_bonus if age_at_death >= 100 else 0

    total_points = (
        base_points
        + captain_points
        + bonus_exclusive
        + bonus_first_blood
        + bonus_youth
        + bonus_centenarian
    )

    return {
        "age_at_death": age_at_death,
        "base_points": base_points,
        "is_captain": is_captain,
        "captain_points": captain_points,
        "is_exclusive": is_exclusive,
        "bonus_exclusive": bonus_exclusive,
        "is_first_blood": is_first_blood,
        "bonus_first_blood": bonus_first_blood,
        "bonus_youth": bonus_youth,
        "bonus_centenarian": bonus_centenarian,
        "total_points": total_points,
    }
