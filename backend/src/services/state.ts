import prisma from '../prisma/client';

export interface PresentationStateData {
  id: number;
  activeFile: string | null;
  currentSlide: number;
  totalSlides: number;
  isStarted: boolean;
  isBlackScreen: boolean;
  presenterNotes: string;
  updatedAt: Date;
}

// In-memory cache for ultra-low latency reads
let _state: PresentationStateData | null = null;

export async function getState(): Promise<PresentationStateData> {
  if (_state) return _state;
  _state = await prisma.presentationState.findFirst();
  if (!_state) {
    _state = await prisma.presentationState.create({
      data: {
        currentSlide: 1,
        totalSlides: 0,
        isStarted: false,
        isBlackScreen: false,
        presenterNotes: '{}',
      },
    });
  }
  return _state;
}

export async function updateState(
  data: Partial<Omit<PresentationStateData, 'id' | 'updatedAt'>>
): Promise<PresentationStateData> {
  const current = await getState();
  _state = await prisma.presentationState.update({
    where: { id: current.id },
    data,
  });
  return _state;
}

export function invalidateStateCache() {
  _state = null;
}
