import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSubmitRequestForListing,
  getAutoRejectedRequestIds,
  isRequestStatusChangeAllowed,
} from './adoptionRules.js';

test('lost and found listings cannot receive adoption requests', () => {
  assert.equal(canSubmitRequestForListing('LOST_FOUND'), false);
  assert.equal(canSubmitRequestForListing('ADOPTION'), true);
  assert.equal(canSubmitRequestForListing('FOSTER'), true);
});

test('only pending requests can move to approved or rejected', () => {
  assert.equal(isRequestStatusChangeAllowed('PENDING', 'APPROVED'), true);
  assert.equal(isRequestStatusChangeAllowed('PENDING', 'REJECTED'), true);
  assert.equal(isRequestStatusChangeAllowed('APPROVED', 'REJECTED'), false);
  assert.equal(isRequestStatusChangeAllowed('PENDING', 'PENDING'), false);
});

test('approving a request returns every other pending request id for closure', () => {
  const ids = getAutoRejectedRequestIds(
    [
      { id: 'req-1', status: 'PENDING' },
      { id: 'req-2', status: 'PENDING' },
      { id: 'req-3', status: 'REJECTED' },
    ],
    'req-1',
  );

  assert.deepEqual(ids, ['req-2']);
});
