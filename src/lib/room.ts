import type { RoomRow } from "./types";

export function isHost(room: RoomRow, uid: string): boolean {
  return room.host_id === uid;
}

export function myName(room: RoomRow, uid: string): string {
  return isHost(room, uid) ? room.host_name : room.guest_name ?? "";
}

export function partnerName(room: RoomRow, uid: string): string {
  return isHost(room, uid) ? room.guest_name ?? "…" : room.host_name;
}

export function myShare(room: RoomRow, uid: string): boolean {
  return isHost(room, uid) ? room.host_share : room.guest_share;
}

export function partnerShare(room: RoomRow, uid: string): boolean {
  return isHost(room, uid) ? room.guest_share : room.host_share;
}

export function mutualShare(room: RoomRow): boolean {
  return room.host_share && room.guest_share;
}

export function myReady(room: RoomRow, uid: string): boolean {
  return isHost(room, uid) ? room.host_ready : room.guest_ready;
}

export function iAmIlkin(room: RoomRow, uid: string): boolean {
  const name = isHost(room, uid) ? room.host_name : room.guest_name ?? "";
  return name.trim() === "İlkin";
}
