import type { ApiChapter, Chapter } from "@/types/chapter";

export const convertApiChaptersToChapters = (
  apiChapters: ApiChapter[],
): Chapter[] => {
  return apiChapters.map((chapter) => ({
    ...chapter,
    createdAt: new Date(chapter.createdAt),
    updatedAt: new Date(chapter.updatedAt),
  }));
};

export type { ApiChapter, Chapter };
