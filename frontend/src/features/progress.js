// Shared-set progress belongs to the learner, never to the published source.
export const progressKey = set => JSON.stringify([set.ownerId || 'own', set.id]);
export function itemProgress(user, set, item) {
  return user.studyProgress?.[progressKey(set)]?.[item.id] || (set.publicSource ? {} : item);
}
export function updateProgress(user, set, item, outcome) {
  user.studyProgress ||= {};
  const group = user.studyProgress[progressKey(set)] ||= {};
  const old = itemProgress(user, set, item);
  const result = {...old, attempts: (old.attempts || 0) + (outcome === null ? 0 : 1),
    correct: (old.correct || 0) + (outcome === true ? 1 : 0),
    needsReview: outcome !== true, skipped: (old.skipped || 0) + (outcome === null ? 1 : 0)};
  // Store only learner metrics, not copied question contents.
  group[item.id] = {attempts:result.attempts, correct:result.correct, needsReview:result.needsReview, skipped:result.skipped};
  if (!set.publicSource) Object.assign(item, group[item.id]);
}
export const reviewItems = (user, set) => set.items.filter(x => itemProgress(user,set,x).needsReview);
