import { describe, it, expect } from 'vitest';
import { validateFeedResponse } from '../feed';

// Shape returned by GET /api/public/v1/feeds/user/{gcid} as of 2026-10-24 (values made up).
// The author moved under post.owner, likes under emotionsData, comments under summary.
const currentDiscussion = {
  id: 'discussion-1',
  post: {
    id: 'post-1',
    owner: { id: '1001', username: 'testuser', firstName: 'Test', lastName: 'User', piLevel: 3 },
    obsoleteId: 'legacy-1',
    created: '2026-10-24T07:28:56.546Z',
    message: { text: 'Buying $AAPL', languageCode: 'en-gb' },
    updated: '2026-10-24T07:28:56.546Z',
    isDeleted: false,
    type: 'Default',
    metadata: {},
    attachments: [],
    isSpam: false,
    editStatus: 'None',
  },
  commentsData: { reactionPaging: { totalCount: 5 }, comments: [] },
  emotionsData: { like: { paging: { totalCount: 39 }, emotions: [] } },
  requesterContext: { isOwner: false },
  summary: { totalCommentsAndReplies: 5, sharedCount: 0 },
};

describe('Feed Schemas', () => {
  describe('validateFeedResponse', () => {
    it('should accept the current feed response shape', () => {
      const result = validateFeedResponse({
        discussions: [currentDiscussion],
        paging: { next: 'cursor', offSet: 1, take: 1, version: 'v2' },
        metadata: { streamType: 'User' },
      });

      expect(result).not.toBeNull();
      const discussion = result!.discussions[0];
      expect(discussion.post.likes).toBe(39);
      expect(discussion.commentsCount).toBe(5);
      expect(discussion.post.userGcid).toBe(1001);
      expect(discussion.post.username).toBe('testuser');
      expect(discussion.post.message.text).toBe('Buying $AAPL');
      expect(discussion.post.message.languageCode).toBe('en-gb');
    });

    it('should default engagement to zero when counts are absent', () => {
      const { emotionsData: _e, summary: _s, ...bare } = currentDiscussion;
      const result = validateFeedResponse({ discussions: [bare] });

      expect(result).not.toBeNull();
      expect(result!.discussions[0].post.likes).toBe(0);
      expect(result!.discussions[0].commentsCount).toBe(0);
    });

    it('should still accept the legacy shape', () => {
      const result = validateFeedResponse({
        discussions: [{
          post: {
            id: 'post-1',
            created: '2024-01-15T10:00:00Z',
            message: { text: 'Hello', languageCode: 'en' },
            likes: 7,
            userGcid: 1001,
            username: 'testuser',
          },
          commentsCount: 2,
        }],
      });

      expect(result).not.toBeNull();
      expect(result!.discussions[0].post.likes).toBe(7);
      expect(result!.discussions[0].commentsCount).toBe(2);
    });

    it('should reject a response without discussions array items shaped as posts', () => {
      expect(validateFeedResponse({ discussions: [{ post: { id: 1 } }] })).toBeNull();
    });
  });
});
