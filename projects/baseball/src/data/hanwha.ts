import type { Batter, Pitcher, TeamData } from '../engine/types';

const hanwhaLineup: Batter[] = [
  { id: 'hw-moon-hyunbin', name: '문현빈', nameEn: 'Moon Hyun-bin', team: 'hanwha', position: 'CF', batSide: 'L', avg: 0.320, obp: 0.395, slg: 0.468, homeRuns: 12, rbi: 58, hits: 175, atBats: 547, stolenBases: 28, speed: 85, power: 52, eye: 78, contact: 88, bunting: 72 },
  { id: 'hw-ha-juseok', name: '하주석', nameEn: 'Ha Ju-seok', team: 'hanwha', position: 'SS', batSide: 'R', avg: 0.278, obp: 0.345, slg: 0.388, homeRuns: 6, rbi: 38, hits: 142, atBats: 511, stolenBases: 18, speed: 75, power: 42, eye: 68, contact: 78, bunting: 68 },
  { id: 'hw-chae-eunseong', name: '채은성', nameEn: 'Chae Eun-seong', team: 'hanwha', position: '1B', batSide: 'R', avg: 0.284, obp: 0.365, slg: 0.498, homeRuns: 22, rbi: 82, hits: 148, atBats: 521, stolenBases: 3, speed: 40, power: 78, eye: 72, contact: 76, bunting: 30 },
  { id: 'hw-noh-sihwan', name: '노시환', nameEn: 'Noh Si-hwan', team: 'hanwha', position: '3B', batSide: 'R', avg: 0.260, obp: 0.355, slg: 0.522, homeRuns: 32, rbi: 101, hits: 135, atBats: 519, stolenBases: 2, speed: 38, power: 90, eye: 75, contact: 62, bunting: 15 },
  { id: 'hw-florial', name: '플로리얼', nameEn: 'Estevan Florial', team: 'hanwha', position: 'LF', batSide: 'L', avg: 0.275, obp: 0.340, slg: 0.465, homeRuns: 18, rbi: 72, hits: 140, atBats: 509, stolenBases: 22, speed: 80, power: 70, eye: 55, contact: 68, bunting: 35 },
  { id: 'hw-choi-jaehoon', name: '최재훈', nameEn: 'Choi Jae-hoon', team: 'hanwha', position: 'C', batSide: 'R', avg: 0.252, obp: 0.325, slg: 0.405, homeRuns: 10, rbi: 50, hits: 118, atBats: 468, stolenBases: 1, speed: 28, power: 55, eye: 65, contact: 68, bunting: 42 },
  { id: 'hw-ahn-chiihong', name: '안치홍', nameEn: 'Ahn Chi-hong', team: 'hanwha', position: '2B', batSide: 'R', avg: 0.268, obp: 0.330, slg: 0.392, homeRuns: 8, rbi: 45, hits: 130, atBats: 485, stolenBases: 5, speed: 50, power: 52, eye: 60, contact: 75, bunting: 58 },
  { id: 'hw-lee-jinyoung', name: '이진영', nameEn: 'Lee Jin-young', team: 'hanwha', position: 'RF', batSide: 'L', avg: 0.255, obp: 0.315, slg: 0.368, homeRuns: 6, rbi: 35, hits: 112, atBats: 439, stolenBases: 8, speed: 62, power: 42, eye: 55, contact: 70, bunting: 55 },
  { id: 'hw-hwang-youngmuk', name: '황영묵', nameEn: 'Hwang Young-muk', team: 'hanwha', position: 'DH', batSide: 'R', avg: 0.245, obp: 0.320, slg: 0.435, homeRuns: 14, rbi: 55, hits: 108, atBats: 441, stolenBases: 1, speed: 32, power: 68, eye: 62, contact: 58, bunting: 20 },
];

const hanwhaBench: Batter[] = [
  { id: 'hw-lee-jaewon', name: '이재원', nameEn: 'Lee Jae-won', team: 'hanwha', position: 'C', batSide: 'R', avg: 0.228, obp: 0.295, slg: 0.310, homeRuns: 2, rbi: 15, hits: 42, atBats: 184, stolenBases: 0, speed: 30, power: 30, eye: 55, contact: 60, bunting: 45 },
  { id: 'hw-kim-inhwan', name: '김인환', nameEn: 'Kim In-hwan', team: 'hanwha', position: 'SS', batSide: 'R', avg: 0.248, obp: 0.308, slg: 0.345, homeRuns: 3, rbi: 22, hits: 58, atBats: 234, stolenBases: 8, speed: 72, power: 35, eye: 50, contact: 65, bunting: 65 },
  { id: 'hw-lim-jongchan', name: '임종찬', nameEn: 'Lim Jong-chan', team: 'hanwha', position: 'LF', batSide: 'L', avg: 0.258, obp: 0.322, slg: 0.372, homeRuns: 5, rbi: 25, hits: 65, atBats: 252, stolenBases: 14, speed: 80, power: 40, eye: 58, contact: 68, bunting: 60 },
];

const hanwhaPitchers: Pitcher[] = [
  { id: 'sp-ponce', name: '폰세', nameEn: 'Cody Ponce', team: 'hanwha', role: 'SP', throwSide: 'R', era: 1.89, whip: 0.92, wins: 17, losses: 1, saves: 0, strikeouts: 195, innings: 180, repertoire: ['직구', '슬라이더', '체인지업', '커브'], stamina: 95, pickoffSkill: 70, quickTime: 65, controlRating: 92 },
  { id: 'sp-weiss', name: '와이스', nameEn: 'Ryan Weiss', team: 'hanwha', role: 'SP', throwSide: 'R', era: 2.87, whip: 1.10, wins: 16, losses: 5, saves: 0, strikeouts: 170, innings: 178, repertoire: ['직구', '커터', '커브', '체인지업'], stamina: 88, pickoffSkill: 55, quickTime: 55, controlRating: 80 },
  { id: 'sp-moon-dongju', name: '문동주', nameEn: 'Moon Dong-ju', team: 'hanwha', role: 'SP', throwSide: 'L', era: 3.95, whip: 1.30, wins: 8, losses: 10, saves: 0, strikeouts: 120, innings: 155, repertoire: ['직구', '슬라이더', '커브'], stamina: 78, pickoffSkill: 60, quickTime: 50, controlRating: 62 },
  { id: 'rp-han-seunghyuk', name: '한승혁', nameEn: 'Han Seung-hyuk', team: 'hanwha', role: 'RP', throwSide: 'R', era: 3.50, whip: 1.20, wins: 4, losses: 3, saves: 3, strikeouts: 65, innings: 60, repertoire: ['직구', '커브', '싱커'], stamina: 68, pickoffSkill: 50, quickTime: 55, controlRating: 65 },
  { id: 'rp-park-junyoung', name: '박준영', nameEn: 'Park Jun-young', team: 'hanwha', role: 'RP', throwSide: 'R', era: 3.75, whip: 1.25, wins: 3, losses: 4, saves: 1, strikeouts: 58, innings: 52, repertoire: ['직구', '슬라이더', '포크볼'], stamina: 65, pickoffSkill: 45, quickTime: 50, controlRating: 62 },
  { id: 'cl-jung-wooju', name: '정우주', nameEn: 'Jung Woo-ju', team: 'hanwha', role: 'CL', throwSide: 'R', era: 2.45, whip: 1.05, wins: 4, losses: 2, saves: 32, strikeouts: 78, innings: 58, repertoire: ['직구', '슬라이더', '포크볼'], stamina: 62, pickoffSkill: 58, quickTime: 68, controlRating: 78 },
];

export const hanwhaTeam: TeamData = {
  id: 'hanwha', name: '한화 이글스', nameEn: 'Hanwha Eagles', abbr: 'HANWHA',
  color: '#FE6500', lineup: hanwhaLineup, bench: hanwhaBench,
  pitchers: hanwhaPitchers, startingPitcher: 0,
};
