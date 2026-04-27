import { ListingType, RequestStatus } from '@prisma/client';

export function canSubmitRequestForListing(listingType) {
  return listingType !== ListingType.LOST_FOUND;
}

export function isRequestStatusChangeAllowed(currentStatus, nextStatus) {
  if (currentStatus !== RequestStatus.PENDING) {
    return false;
  }

  return nextStatus === RequestStatus.APPROVED || nextStatus === RequestStatus.REJECTED;
}

export function getAutoRejectedRequestIds(requests, approvedRequestId) {
  return requests
    .filter(
      (request) =>
        request.id !== approvedRequestId && request.status === RequestStatus.PENDING,
    )
    .map((request) => request.id);
}
