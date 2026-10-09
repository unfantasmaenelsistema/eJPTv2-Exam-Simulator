import { LabDefinition } from '../../types/simulator';
import { LAB_CORPNET } from './lab1CorpNet';
import { LAB_FINTECH } from './lab2Fintech';

export const ALL_LABS: LabDefinition[] = [
  LAB_CORPNET,
  LAB_FINTECH
];

export function getLabById(id: string): LabDefinition {
  const found = ALL_LABS.find(l => l.id === id);
  return found || ALL_LABS[0];
}
