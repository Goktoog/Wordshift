import { session } from '../core/state.js';
import { runner } from './runner.js';
import { battle } from './battleship.js';
import { match } from './matching.js';
import { meteor } from './meteor.js';

export function play(){const m=session.m;if(m==='runner'){runner();return}if(m==='battle'){battle();return}if(m==='blocks'){match();return}meteor()}
