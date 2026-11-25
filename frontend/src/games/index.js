import { sentences } from './sentences.js';
import { session } from '../core/state.js';
import { detective } from './detective.js';
import { tower } from './tower.js';
import { crossing } from './crossing.js';
import { runner } from './runner.js';
import { battle } from './battleship.js';
import { match } from './matching.js';
import { meteor } from './meteor.js';

export function play(){const m=session.m;if(m==='detective'){detective();return}if(m==='tower'){tower();return}if(m==='crossing'){crossing();return}if(m==='runner'){runner();return}if(m==='battle'){battle();return}if(m==='sentences'){sentences();return}if(m==='blocks'){match();return}meteor()}
