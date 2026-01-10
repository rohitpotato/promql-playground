import { useContext } from 'react';
import { PlaygroundContext, type PlaygroundContextValue } from '../context/PlaygroundContext';

export function usePlayground(): PlaygroundContextValue {
  const context = useContext(PlaygroundContext);
  if (!context) {
    throw new Error('usePlayground must be used within a PlaygroundProvider');
  }
  return context;
}

