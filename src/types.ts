/**
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GlobalSettings {
  profileImageUrl: string;
  welcomeMessage: string;
  geminiKeys: string[];
  updatedAt?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'teacher';
  text: string;
  imageUrl?: string;
  createdAt: string;
}
