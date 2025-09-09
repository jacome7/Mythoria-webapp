import {
  convertApiChaptersToChapters,
  type ApiChapter,
} from "@/utils/chapterConversion";

describe("convertApiChaptersToChapters", () => {
  it("converts date strings to Date objects", () => {
    const apiChapters: ApiChapter[] = [
      {
        id: "1",
        chapterNumber: 1,
        title: "Test",
        imageUri: null,
        imageThumbnailUri: null,
        htmlContent: "<p>Hello</p>",
        audioUri: null,
        version: 1,
        hasNextVersion: false,
        hasPreviousVersion: false,
        createdAt: "2024-06-17T12:34:56Z",
        updatedAt: "2024-06-18T12:34:56Z",
      },
    ];

    const chapters = convertApiChaptersToChapters(apiChapters);

    expect(chapters).toHaveLength(1);
    expect(chapters[0].createdAt).toBeInstanceOf(Date);
    expect(chapters[0].updatedAt).toBeInstanceOf(Date);
    expect(chapters[0].title).toBe("Test");
  });
});
