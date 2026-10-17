import {describe,it,expect} from 'vitest';
import {Chess} from 'chess.js';
import {lessons} from '../src/content/lessons';
import puzzles from '../src/content/puzzles.json';
import {themes} from '../src/content/themes';
import {moveUci} from '../src/lib/chess';
describe('课程与战术内容',()=>{
 it('所有课程示范和目标走法均合法，局部练习不依赖终局判断',()=>{
  expect(lessons).toHaveLength(12);
  for(const lesson of lessons){const demo=new Chess(lesson.exercises[0].fen);for(const m of lesson.demo)expect(()=>moveUci(demo,m),lesson.id).not.toThrow();
   for(const ex of lesson.exercises){const c=new Chess(ex.fen);if(ex.move){const move=ex.move;expect(()=>moveUci(c,move),lesson.id).not.toThrow();}else{expect(ex.choices).toBeDefined();expect(c.isStalemate()).toBe(true);expect(ex.answer).toBe(1);}}
  }
 });
 it('60 道唯一题目，每主题十题，起手、解答、中文变化说明一致',()=>{
  expect(puzzles).toHaveLength(60);expect(new Set(puzzles.map(p=>p.id)).size).toBe(60);
  for(const theme of themes)expect(puzzles.filter(p=>p.theme===theme.id)).toHaveLength(10);
  for(const p of puzzles){const c=new Chess(p.fen);const setup=moveUci(c,p.moves[0]);expect(setup.san).toBe(p.setupSan);expect(c.fen()).toBe(p.startFen);expect(p.hints).toHaveLength(3);
   for(const step of p.steps){const m=moveUci(c,step.uci);expect(m.san).toBe(step.san);expect(step.text).toContain(m.from);expect(step.text).toContain(m.to);}
   if(p.theme==='mateIn1')expect(c.isCheckmate()).toBe(true);
  }
 });
});
