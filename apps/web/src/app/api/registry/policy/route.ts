import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    isFreeForConsumers: true,
    requiresIdentityVerification: true,
    consumerControlledVisibility: true,
    everyQueryIsLoggedAndNotified: true,
    pendingLegalReview: {
      institutionalParticipants: [],
      estimatedMatchRate: null,
      jurisdictionalCoverage: ['US', 'CA'],
    },
  });
}
