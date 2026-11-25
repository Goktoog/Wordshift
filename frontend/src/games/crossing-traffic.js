// Positions are in road coordinates. The chicken crosses at x=0 and rests on integer medians.
export const traffic = [
  {direction:1, speed:148, spacing:490, phase:125, length:76, color:'#f48162'},
  {direction:1, speed:183, spacing:550, phase:331, length:68, color:'#6abcc6'},
  {direction:-1, speed:159, spacing:455, phase:88, length:82, color:'#f6cd64'}
];
export const hopTime = .95;
export function nearestCar(lane, time) {
  const distance = (lane.phase + lane.speed * time) % lane.spacing;
  return lane.direction * (distance > lane.spacing / 2 ? distance - lane.spacing : distance);
}
// A lane is dangerous from 27% to 73% of a hop. Sweep both moving footprints
// over the frame interval so a car cannot pass through the chicken between frames.
export function crossingHit(index, start, from, to) {
  const lane = traffic[index];
  const entry = Math.max(from, start + .27 * hopTime);
  const exit = Math.min(to, start + .73 * hopTime);
  if (entry > exit) return false;
  const clearance = lane.length / 2 + 9;
  const left = lane.phase + lane.speed * entry - clearance;
  const right = lane.phase + lane.speed * exit + clearance;
  return Math.ceil(left / lane.spacing) <= Math.floor(right / lane.spacing);
}
export function safeToGo(index, time) {
  return !crossingHit(index, time, time, time + hopTime);
}
