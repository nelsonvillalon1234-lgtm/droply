export interface OfferMessage {

    room: string;

    offer: RTCSessionDescriptionInit;

}

export interface AnswerMessage {

    room: string;

    answer: RTCSessionDescriptionInit;

}

export interface IceCandidateMessage {

    room: string;

    candidate: RTCIceCandidateInit;

}