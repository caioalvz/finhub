import type { CategoryId } from './types';

export const CATEGORIES: { id: CategoryId; label: string; color: string; icon: string }[] = [
  { id: 'cartoes', label: 'Cartões', color: '#E4572E', icon: 'card' },
  { id: 'alimentacao', label: 'Alimentação', color: '#F3A712', icon: 'restaurant' },
  { id: 'casa', label: 'Casa e contas', color: '#2E86AB', icon: 'home' },
  { id: 'saude', label: 'Saúde', color: '#17A398', icon: 'medkit' },
  { id: 'assinaturas', label: 'Assinaturas', color: '#8E6BBF', icon: 'play-circle' },
  { id: 'transporte', label: 'Transporte', color: '#6C757D', icon: 'car' },
  { id: 'lazer', label: 'Lazer', color: '#E56399', icon: 'game-controller' },
  { id: 'trabalho', label: 'MEI / Trabalho', color: '#4F772D', icon: 'briefcase' },
  { id: 'outros', label: 'Outros', color: '#9A8C7A', icon: 'ellipsis-horizontal-circle' },
];

export const RESERVE_COLOR = '#2A9D8F';

export function categoryOf(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
