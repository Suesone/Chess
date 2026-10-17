import { gameFromPgn } from './chess';
import { lessons } from '../content/lessons';
import puzzles from '../content/puzzles.json';
export type Progress={version:1;lessons:string[];solved:string[];mistakes:string[];settings:{level:'beginner'|'casual'|'challenge';side:'w'|'b';coach:boolean;dests:boolean};pgn:string;updatedAt:string};
export const STORAGE_KEY='first-move.progress.v1';
export function freshProgress():Progress{return {version:1,lessons:[],solved:[],mistakes:[],settings:{level:'beginner',side:'w',coach:true,dests:true},pgn:'',updatedAt:new Date().toISOString()};}
export function validateProgress(value:unknown):Progress{
 if(!value||typeof value!=='object')throw Error('进度文件格式不正确。');
 const v=value as Progress, s=v.settings;
 if(v.version!==1)throw Error('不支持这个进度文件版本。');
 const ids=(list:unknown,valid:Set<string>)=>Array.isArray(list)&&list.length<=1000&&list.every(x=>typeof x==='string'&&valid.has(x))&&new Set(list).size===list.length;
 if(!ids(v.lessons,new Set(lessons.map(x=>x.id)))||!ids(v.solved,new Set(puzzles.map(x=>x.id)))||!ids(v.mistakes,new Set(puzzles.map(x=>x.id))))throw Error('课程或题目记录不正确。');
 if(!s||!['beginner','casual','challenge'].includes(s.level)||!['w','b'].includes(s.side)||typeof s.coach!=='boolean'||typeof s.dests!=='boolean'||typeof v.pgn!=='string'||v.pgn.length>100000||typeof v.updatedAt!=='string'||!Number.isFinite(Date.parse(v.updatedAt)))throw Error('设置或对局记录不正确。');
 try{gameFromPgn(v.pgn);}catch{throw Error('保存的棋谱无法读取。');}
 return {version:1,lessons:[...v.lessons],solved:[...v.solved],mistakes:[...v.mistakes],settings:{level:s.level,side:s.side,coach:s.coach,dests:s.dests},pgn:v.pgn,updatedAt:v.updatedAt};
}
export function readProgress():{progress:Progress;warning:string}{try{const raw=localStorage.getItem(STORAGE_KEY);return {progress:raw?validateProgress(JSON.parse(raw)):freshProgress(),warning:''};}catch{return {progress:freshProgress(),warning:'无法读取本机进度。可能是浏览器限制或旧数据损坏；请先导出备份，避免清除浏览器数据。'};}}
export function saveProgress(progress:Progress){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(progress));return true;}catch{return false;}}
export function download(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
