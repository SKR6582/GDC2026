import type { SensoryBlurState, ToolId } from '../types/game';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface SensorySoundInput {
  position: Vec3Like;
  amplitude: number;
  kind: 'electronic' | 'organic';
}

export interface SensoryRfInput {
  position: Vec3Like;
  strength: number;
}

const BASE_HEARING_RADIUS = 4.6;
const FOCUS_HEARING_RADIUS = 7.8;
const RF_RADIUS = 3.8;
const SPOTLIGHT_COST = 35;
const SPOTLIGHT_COOLDOWN = 3.0;
const SPOTLIGHT_BEAM_DURATION = 1.1;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export class SensorySystem {
  private leftIntensity = 0;
  private rightIntensity = 0;
  private leftPulseHz = 2.3;
  private rightPulseHz = 2.3;
  private rfBattery = 100;
  private spotlightBattery = 100;
  private spotlightCooldown = 0;
  private beamRemainingSec = 0;

  reset(): void {
    this.leftIntensity = 0;
    this.rightIntensity = 0;
    this.leftPulseHz = 2.3;
    this.rightPulseHz = 2.3;
    this.rfBattery = 100;
    this.spotlightBattery = 100;
    this.spotlightCooldown = 0;
    this.beamRemainingSec = 0;
  }

  tryFireSpotlight(): boolean {
    if (this.spotlightBattery < SPOTLIGHT_COST || this.spotlightCooldown > 0) {
      return false;
    }
    this.spotlightBattery = Math.max(0, this.spotlightBattery - SPOTLIGHT_COST);
    this.spotlightCooldown = SPOTLIGHT_COOLDOWN;
    this.beamRemainingSec = SPOTLIGHT_BEAM_DURATION;
    return true;
  }

  isBeamActive(): boolean {
    return this.beamRemainingSec > 0;
  }

  update(params: {
    dt: number;
    proctorPos: Vec3Like;
    forwardXZ: { x: number; z: number };
    rightXZ: { x: number; z: number };
    isFocusingHearing: boolean;
    activeTool: ToolId;
    soundSources: SensorySoundInput[];
    rfSources: SensoryRfInput[];
  }): { state: SensoryBlurState; rfDepleted: boolean } {
    const {
      dt,
      proctorPos,
      forwardXZ,
      rightXZ,
      isFocusingHearing,
      activeTool,
      soundSources,
      rfSources,
    } = params;

    const maxRadius = isFocusingHearing ? FOCUS_HEARING_RADIUS : BASE_HEARING_RADIUS;
    let rawLeft = 0;
    let rawRight = 0;
    let maxLeftContrib = 0;
    let maxRightContrib = 0;
    let dominantLeftHz = 2.3;
    let dominantRightHz = 2.3;

    for (const source of soundSources) {
      const dx = source.position.x - proctorPos.x;
      const dz = source.position.z - proctorPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxRadius || dist < 0.05) {
        continue;
      }

      const dirX = dx / dist;
      const dirZ = dz / dist;
      const pan = Math.max(-1, Math.min(1, rightXZ.x * dirX + rightXZ.z * dirZ));
      const frontDot = forwardXZ.x * dirX + forwardXZ.z * dirZ;
      const frontWeight = 0.65 + 0.35 * Math.max(0, frontDot);
      const distFactor = Math.pow(1 - dist / maxRadius, 1.35) * source.amplitude * frontWeight;
      const boost = isFocusingHearing ? 1.18 : 1.0;

      const leftWeight = pan < 0 ? Math.min(1, 0.35 + Math.abs(pan) * 0.65) : Math.max(0, 0.35 - pan * 0.5);
      const rightWeight = pan > 0 ? Math.min(1, 0.35 + Math.abs(pan) * 0.65) : Math.max(0, 0.35 + pan * 0.5);

      const leftContrib = clamp01(distFactor * leftWeight * boost);
      const rightContrib = clamp01(distFactor * rightWeight * boost);

      rawLeft = 1 - (1 - rawLeft) * (1 - leftContrib);
      rawRight = 1 - (1 - rawRight) * (1 - rightContrib);

      const sourceHz = source.kind === 'electronic' ? 5.2 : 2.3;
      if (leftContrib > maxLeftContrib) {
        maxLeftContrib = leftContrib;
        dominantLeftHz = sourceHz;
      }
      if (rightContrib > maxRightContrib) {
        maxRightContrib = rightContrib;
        dominantRightHz = sourceHz;
      }
    }

    const alpha = 1 - Math.exp(-8.5 * dt);
    this.leftIntensity += (rawLeft - this.leftIntensity) * alpha;
    this.rightIntensity += (rawRight - this.rightIntensity) * alpha;
    if (maxLeftContrib > 0.02) {
      this.leftPulseHz = dominantLeftHz;
    }
    if (maxRightContrib > 0.02) {
      this.rightPulseHz = dominantRightHz;
    }

    let rfBars = 0;
    let rfDepleted = false;
    if (activeTool === 'rf_detector' && this.rfBattery > 0) {
      this.rfBattery = Math.max(0, this.rfBattery - 7.0 * dt);
      if (this.rfBattery <= 0) {
        rfDepleted = true;
      } else {
        let rfSum = 0;
        for (const source of rfSources) {
          const dist = Math.hypot(
            source.position.x - proctorPos.x,
            source.position.z - proctorPos.z,
          );
          if (dist <= RF_RADIUS) {
            rfSum += source.strength * (1 - dist / RF_RADIUS);
          }
        }
        if (rfSum >= 1.25) rfBars = 3;
        else if (rfSum >= 0.65) rfBars = 2;
        else if (rfSum >= 0.15) rfBars = 1;
      }
    } else {
      this.rfBattery = Math.min(100, this.rfBattery + 11.0 * dt);
    }

    this.spotlightBattery = Math.min(100, this.spotlightBattery + 8.0 * dt);
    if (this.spotlightCooldown > 0) {
      this.spotlightCooldown = Math.max(0, this.spotlightCooldown - dt);
    }
    if (this.beamRemainingSec > 0) {
      this.beamRemainingSec = Math.max(0, this.beamRemainingSec - dt);
    }

    return {
      rfDepleted,
      state: {
        leftIntensity: clamp01(this.leftIntensity),
        rightIntensity: clamp01(this.rightIntensity),
        leftPulseHz: this.leftPulseHz,
        rightPulseHz: this.rightPulseHz,
        rfBars,
        rfBattery: Math.round(this.rfBattery),
        spotlightBattery: Math.round(this.spotlightBattery),
        spotlightCooldown: Number(this.spotlightCooldown.toFixed(1)),
      },
    };
  }
}
