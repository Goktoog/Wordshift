export const arcadeModes=['tower','crossing','detective'];
export const runOver=s=>s.lives===0 || s.score>=3 || s.i>=s.pool.length;
export const livesLabel=s=>'♥ '+s.lives+'/3 can';
