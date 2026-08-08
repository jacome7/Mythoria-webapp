const mockGetStoryBySlug = jest.fn();
const mockFetch = jest.fn();

jest.mock('@/db/services', () => ({
  storyService: {
    getStoryBySlug: (...args: unknown[]) => mockGetStoryBySlug(...args),
  },
}));

import { GET } from './route';

const routeContext = (document: string) => ({
  params: Promise.resolve({ slug: 'historia-de-exemplo', document }),
});

const eligibleStory = {
  title: 'História de Exemplo',
  isPublic: true,
  isFeatured: true,
  coverPdfUri:
    'https://storage.googleapis.com/mythoria-generated-stories/story/print/cover-cmyk.pdf',
  interiorPdfUri:
    'https://storage.googleapis.com/mythoria-generated-stories/story/print/interior-cmyk.pdf',
};

describe('GET /api/p/[slug]/pdf/[document]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStoryBySlug.mockResolvedValue(eligibleStory);
    mockFetch.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-length': '3' },
      }),
    );
    global.fetch = mockFetch as typeof fetch;
  });

  it.each([
    ['cover', 'cover-cmyk.pdf', 'historia-de-exemplo-capa.pdf'],
    ['interior', 'interior-cmyk.pdf', 'historia-de-exemplo-livro.pdf'],
  ])('streams the %s PDF as a direct download', async (document, sourceFilename, filename) => {
    const response = await GET(new Request('http://localhost'), routeContext(document));

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(sourceFilename));
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(`attachment; filename="${filename}"`);
    expect(response.headers.get('content-length')).toBe('3');
    expect(await response.arrayBuffer()).toEqual(new Uint8Array([1, 2, 3]).buffer);
  });

  it.each([
    ['private story', { ...eligibleStory, isPublic: false }, 'cover'],
    ['non-featured story', { ...eligibleStory, isFeatured: false }, 'cover'],
    ['missing final interior PDF', { ...eligibleStory, interiorPdfUri: null }, 'cover'],
    ['invalid document', eligibleStory, 'book'],
  ])('returns 404 for a %s', async (_label, story, document) => {
    mockGetStoryBySlug.mockResolvedValue(story);

    const response = await GET(new Request('http://localhost'), routeContext(document));

    expect(response.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 404 when the final PDF is no longer present in storage', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 404 }));

    const response = await GET(new Request('http://localhost'), routeContext('cover'));

    expect(response.status).toBe(404);
  });
});
