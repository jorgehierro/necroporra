import { PointsBreakdown } from "./types";

export function calculateBasePoints(ageAtDeath: number): number {
  if (ageAtDeath < 0) ageAtDeath = 0;
  return Math.max(1, 100 - ageAtDeath);
}

export function calculatePointsBreakdown({
  ageAtDeath,
  isCaptain = false,
  isExclusive = false,
  isFirstBlood = false,
  captainMultiplier = 2.0,
  exclusiveBonus = 10,
  firstBloodBonus = 10,
  youthBonus = 15,
  youthAgeThreshold = 55,
  centenarianBonus = 5,
}: {
  ageAtDeath: number;
  isCaptain?: boolean;
  isExclusive?: boolean;
  isFirstBlood?: boolean;
  captainMultiplier?: number;
  exclusiveBonus?: number;
  firstBloodBonus?: number;
  youthBonus?: number;
  youthAgeThreshold?: number;
  centenarianBonus?: number;
}): PointsBreakdown {
  const basePoints = calculateBasePoints(ageAtDeath);
  const captainPoints = isCaptain ? Math.floor(basePoints * (captainMultiplier - 1.0)) : 0;
  const bonusExclusive = isExclusive ? exclusiveBonus : 0;
  const bonusFirstBlood = isFirstBlood ? firstBloodBonus : 0;
  const bonusYouth = ageAtDeath < youthAgeThreshold ? youthBonus : 0;
  const bonusCentenarian = ageAtDeath >= 100 ? centenarianBonus : 0;

  const totalPoints =
    basePoints +
    captainPoints +
    bonusExclusive +
    bonusFirstBlood +
    bonusYouth +
    bonusCentenarian;

  return {
    age_at_death: ageAtDeath,
    base_points: basePoints,
    is_captain: isCaptain,
    captain_points: captainPoints,
    is_exclusive: isExclusive,
    bonus_exclusive: bonusExclusive,
    is_first_blood: isFirstBlood,
    bonus_first_blood: bonusFirstBlood,
    bonus_youth: bonusYouth,
    bonus_centenarian: bonusCentenarian,
    total_points: totalPoints,
  };
}
