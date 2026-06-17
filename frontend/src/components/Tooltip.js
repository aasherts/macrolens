import React from 'react';
import { getDefinition } from '../data/glossary';

// Generic info-bubble tooltip. Pass explicit `text`, or `term` to look it
// up in the glossary so definitions stay consistent across the app.
export function InfoTip({ text, term }) {
  const content = text || (term ? getDefinition(term) : null);
  if (!content) return null;
  return (
    <span className="info-tip" tabIndex={0}>
      ?
      <span className="info-tip-bubble">{content}</span>
    </span>
  );
}

// Wraps a glossary term in dotted-underline styling with a hover tooltip.
export function Term({ name, children }) {
  const def = getDefinition(name);
  if (!def) return <>{children || name}</>;
  return (
    <span className="glossary-term" tabIndex={0}>
      {children || name}
      <span className="info-tip-bubble glossary-bubble">{def}</span>
    </span>
  );
}

export default InfoTip;
