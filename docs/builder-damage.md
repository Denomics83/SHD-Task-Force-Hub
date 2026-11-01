# Builder damage formula

The calculator uses one shot value, then reads crit and headshot off it.

```
scaled = Base
  × (1 + AllWeaponDamage + WeaponTypeDamage + Expertise)
  × (1 + TotalWeaponDamage)
  × product of (1 + each amplified talent)
  × (1 + DamageToHealth)   on a health target
  × (1 + DamageToArmor)    on an armor target
  × (1 + DamageToTargetsOutOfCover)  when out of cover is on

shot = scaled × (1 + CriticalHitDamage × crit + (InnateHeadshot + HeadshotDamage) × head)
```

Critical hit chance is capped at 60. The average shot is the health-pool body shot with no headshot: `body × (1 + CHC × CHD)`. Burst DPS divides by nothing but the fire rate (`shot × RPM / 60`). Sustained DPS puts reload back in: `shot × mag / (mag × 60 / RPM + reloadSeconds)`. Reload seconds are the catalog time divided by `(1 + reload speed)`.

Talent percentages come from the Build Station `calcEffects` on the saved share `INlIgxZJ` (1 Nov 2026), written down in `data/td2/builder/talent-calc.json`. The bucket split is the March 2019 Division 2 test post and the April 2024 amplified-versus-total-weapon-damage thread, which `data/td2/builder/damage.json` links. A talent with no coefficient shows "Not included in calculations" and adds nothing.

The saved Build Station page renders the calculator with zeros, so these tests check the formula and those coefficients. They are not a pasted DPS readout from that page.
