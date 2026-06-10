import type { Batter, Pitcher, TeamData } from '../engine/types';

const samsungLineup: Batter[] = [
  { id: 'ss-kim-jichan', name: '김지찬', nameEn: 'Kim Ji-chan', team: 'samsung', position: 'CF', batSide: 'L', avg: 0.291, obp: 0.362, slg: 0.408, homeRuns: 8, rbi: 42, hits: 152, atBats: 522, stolenBases: 45, speed: 92, power: 45, eye: 72, contact: 82, bunting: 78 },
  { id: 'ss-koo-jauk', name: '구자욱', nameEn: 'Koo Ja-wook', team: 'samsung', position: 'LF', batSide: 'L', avg: 0.305, obp: 0.385, slg: 0.498, homeRuns: 18, rbi: 75, hits: 165, atBats: 541, stolenBases: 12, speed: 65, power: 72, eye: 80, contact: 85, bunting: 55 },
  { id: 'ss-diaz', name: '르윈 디아즈', nameEn: 'Lewin Diaz', team: 'samsung', position: '1B', batSide: 'L', avg: 0.312, obp: 0.398, slg: 0.645, homeRuns: 50, rbi: 158, hits: 170, atBats: 545, stolenBases: 2, speed: 35, power: 98, eye: 78, contact: 80, bunting: 15 },
  { id: 'ss-kang-minho', name: '강민호', nameEn: 'Kang Min-ho', team: 'samsung', position: 'C', batSide: 'R', avg: 0.275, obp: 0.340, slg: 0.448, homeRuns: 15, rbi: 68, hits: 138, atBats: 502, stolenBases: 1, speed: 30, power: 65, eye: 62, contact: 75, bunting: 40 },
  { id: 'ss-kim-youngoong', name: '김영웅', nameEn: 'Kim Young-woong', team: 'samsung', position: 'SS', batSide: 'R', avg: 0.268, obp: 0.332, slg: 0.415, homeRuns: 12, rbi: 55, hits: 140, atBats: 522, stolenBases: 15, speed: 72, power: 58, eye: 65, contact: 72, bunting: 62 },
  { id: 'ss-lee-jaehyun', name: '이재현', nameEn: 'Lee Jae-hyun', team: 'samsung', position: '3B', batSide: 'R', avg: 0.262, obp: 0.325, slg: 0.398, homeRuns: 10, rbi: 48, hits: 130, atBats: 496, stolenBases: 8, speed: 60, power: 55, eye: 58, contact: 70, bunting: 55 },
  { id: 'ss-kim-sungyun', name: '김성윤', nameEn: 'Kim Sung-yun', team: 'samsung', position: 'RF', batSide: 'L', avg: 0.258, obp: 0.320, slg: 0.375, homeRuns: 8, rbi: 40, hits: 125, atBats: 484, stolenBases: 6, speed: 58, power: 48, eye: 60, contact: 72, bunting: 50 },
  { id: 'ss-ryu-jihyuk', name: '류지혁', nameEn: 'Ryu Ji-hyuk', team: 'samsung', position: '2B', batSide: 'R', avg: 0.245, obp: 0.310, slg: 0.338, homeRuns: 5, rbi: 35, hits: 115, atBats: 469, stolenBases: 10, speed: 68, power: 38, eye: 62, contact: 68, bunting: 72 },
  { id: 'ss-park-byungho', name: '박병호', nameEn: 'Park Byung-ho', team: 'samsung', position: 'DH', batSide: 'R', avg: 0.248, obp: 0.335, slg: 0.478, homeRuns: 20, rbi: 65, hits: 110, atBats: 444, stolenBases: 0, speed: 25, power: 82, eye: 70, contact: 60, bunting: 10 },
];

const samsungBench: Batter[] = [
  { id: 'ss-kim-jaesung', name: '김재성', nameEn: 'Kim Jae-sung', team: 'samsung', position: 'C', batSide: 'R', avg: 0.232, obp: 0.298, slg: 0.320, homeRuns: 3, rbi: 20, hits: 55, atBats: 237, stolenBases: 2, speed: 35, power: 35, eye: 55, contact: 62, bunting: 45 },
  { id: 'ss-jeon-byungwoo', name: '전병우', nameEn: 'Jeon Byung-woo', team: 'samsung', position: '2B', batSide: 'L', avg: 0.255, obp: 0.315, slg: 0.355, homeRuns: 4, rbi: 25, hits: 68, atBats: 267, stolenBases: 12, speed: 78, power: 40, eye: 55, contact: 68, bunting: 70 },
  { id: 'ss-lee-seonggyu', name: '이성규', nameEn: 'Lee Seong-gyu', team: 'samsung', position: 'RF', batSide: 'L', avg: 0.265, obp: 0.330, slg: 0.380, homeRuns: 5, rbi: 28, hits: 72, atBats: 272, stolenBases: 15, speed: 82, power: 42, eye: 60, contact: 70, bunting: 55 },
];

const samsungPitchers: Pitcher[] = [
  { id: 'sp-won-taein', name: '원태인', nameEn: 'Won Tae-in', team: 'samsung', role: 'SP', throwSide: 'R', era: 2.75, whip: 1.08, wins: 16, losses: 5, saves: 0, strikeouts: 165, innings: 190, repertoire: ['직구', '슬라이더', '체인지업', '커브'], stamina: 90, pickoffSkill: 65, quickTime: 60, controlRating: 85 },
  { id: 'sp-jurado', name: '후라도', nameEn: 'Ariel Jurado', team: 'samsung', role: 'SP', throwSide: 'R', era: 3.45, whip: 1.22, wins: 12, losses: 8, saves: 0, strikeouts: 140, innings: 175, repertoire: ['직구', '커터', '슬라이더', '커브'], stamina: 85, pickoffSkill: 55, quickTime: 50, controlRating: 72 },
  { id: 'sp-reyes', name: '레예스', nameEn: 'Denny Reyes', team: 'samsung', role: 'SP', throwSide: 'R', era: 3.80, whip: 1.28, wins: 10, losses: 9, saves: 0, strikeouts: 130, innings: 165, repertoire: ['직구', '슬라이더', '체인지업'], stamina: 82, pickoffSkill: 50, quickTime: 45, controlRating: 68 },
  { id: 'rp-lim-changmin', name: '임창민', nameEn: 'Lim Chang-min', team: 'samsung', role: 'RP', throwSide: 'R', era: 3.20, whip: 1.15, wins: 5, losses: 3, saves: 2, strikeouts: 70, innings: 68, repertoire: ['직구', '커브', '체인지업'], stamina: 70, pickoffSkill: 55, quickTime: 65, controlRating: 70 },
  { id: 'rp-kim-taehoon', name: '김태훈', nameEn: 'Kim Tae-hoon', team: 'samsung', role: 'RP', throwSide: 'R', era: 3.55, whip: 1.18, wins: 4, losses: 2, saves: 1, strikeouts: 55, innings: 55, repertoire: ['직구', '슬라이더', '포크볼'], stamina: 65, pickoffSkill: 50, quickTime: 55, controlRating: 65 },
  { id: 'cl-kim-jaeyun', name: '김재윤', nameEn: 'Kim Jae-yun', team: 'samsung', role: 'CL', throwSide: 'R', era: 2.10, whip: 0.98, wins: 3, losses: 2, saves: 38, strikeouts: 85, innings: 62, repertoire: ['직구', '슬라이더', '포크볼'], stamina: 60, pickoffSkill: 60, quickTime: 70, controlRating: 82 },
];

export const samsungTeam: TeamData = {
  id: 'samsung', name: '삼성 라이온즈', nameEn: 'Samsung Lions', abbr: 'SAMSUNG',
  color: '#074CA1', lineup: samsungLineup, bench: samsungBench,
  pitchers: samsungPitchers, startingPitcher: 0,
};
