const mockLoader = jest.fn();

jest.mock('@digitalcredentials/jsonld', () => ({
  documentLoaders: {
    xhr: jest.fn(() => mockLoader),
  },
}));

const {DocumentLoader} = require('./DocumentLoader');

describe('DocumentLoader', () => {
  beforeEach(() => {
    mockLoader.mockReset();
  });

  describe('httpsLoader', () => {
    it('should parse string document into object', async () => {
      mockLoader.mockResolvedValue({
        document: '{"id":"did:web:example.com"}',
      });

      const result = await (DocumentLoader as any).httpsLoader(
        'https://example.com/did.json',
      );

      expect(result.document).toEqual({
        id: 'did:web:example.com',
      });
    });

    it('should throw when document is not a string or object', async () => {
      mockLoader.mockResolvedValue({
        document: 123,
      });

      await expect(
        (DocumentLoader as any).httpsLoader('https://example.com/did.json'),
      ).rejects.toThrow(
        'Unsupported document type for https://example.com/did.json: number',
      );
    });

    it('should throw when document contains invalid JSON', async () => {
      mockLoader.mockResolvedValue({
        document: '{invalid json}',
      });

      await expect(
        (DocumentLoader as any).httpsLoader('https://example.com/did.json'),
      ).rejects.toThrow(
        'Failed to parse JSON document from https://example.com/did.json',
      );
    });
  });

  describe('didWebDocumentLoader', () => {
    it('should resolve root did:web DID', async () => {
      mockLoader.mockResolvedValue({
        document: {
          id: 'did:web:example.com',
        },
      });

      const result = await DocumentLoader.didWebDocumentLoader(
        'did:web:example.com',
      );

      expect(mockLoader).toHaveBeenCalledWith(
        'https://example.com/.well-known/did.json',
      );

      expect(result.document).toEqual({
        id: 'did:web:example.com',
      });

      expect(result.documentUrl).toBe('did:web:example.com');
    });

    it('should resolve did:web with path', async () => {
      mockLoader.mockResolvedValue({
        document: {
          id: 'did:web:example.com:user',
        },
      });

      await DocumentLoader.didWebDocumentLoader('did:web:example.com:user');

      expect(mockLoader).toHaveBeenCalledWith(
        'https://example.com/user/did.json',
      );
    });

    it('should ignore fragment while resolving DID', async () => {
      mockLoader.mockResolvedValue({
        document: {
          id: 'did:web:example.com',
        },
      });

      const result = await DocumentLoader.didWebDocumentLoader(
        'did:web:example.com#key-1',
      );

      expect(mockLoader).toHaveBeenCalledWith(
        'https://example.com/.well-known/did.json',
      );

      expect(result.documentUrl).toBe('did:web:example.com#key-1');
    });

    it('should propagate loader errors', async () => {
      mockLoader.mockRejectedValue(new Error('network error'));

      await expect(
        DocumentLoader.didWebDocumentLoader('did:web:example.com'),
      ).rejects.toThrow('network error');
    });

    it('should throw for unsupported URL scheme', async () => {
      await expect(
        DocumentLoader.didWebDocumentLoader('ftp://example.com'),
      ).rejects.toThrow('Unsupported URL: ftp://example.com');
    });
  });
});
