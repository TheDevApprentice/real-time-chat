export interface CallRequestDTO {
  calleeId: string;
  media: "audio" | "video";
}

export interface CallAcceptDTO {
  callId: string;
}

export interface CallDeclineDTO {
  callId: string;
  reason?: string;
}

export interface CallCancelDTO {
  callId: string;
}

export interface CallOfferDTO {
  callId: string;
  sdp: string;
}

export interface CallAnswerDTO {
  callId: string;
  sdp: string;
}

export interface CallIceCandidateDTO {
  callId: string;
  candidate: any; // Use RTCIceCandidateInit if you want strict typing
}

export interface CallHangupDTO {
  callId: string;
  reason?: string;
}
