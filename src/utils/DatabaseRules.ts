// Firebase Security Rules - DENY BY DEFAULT
// Bu qaydalar Firebase Firestore-da istifadə ediləcək

export const FIRESTORE_SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // DEFAULT DENY ALL - Heç bir kolleksiya hamıya açıq deyil
    match /{document=**} {
      allow read, write: if false;
    }
    
    // USERS kolleksiyası - yalnız öz profilini oxuya/dəyişə bilər
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null && 
                     request.auth.uid in resource.data.familyMembers;
    }
    
    // FAMILY_MESSAGES - yalnız ailə üzvləri
    match /family_messages/{messageId} {
      allow read: if request.auth.uid != null && 
                     isValidFamilyMember(request.auth.uid);
      allow create: if request.auth.uid != null && 
                       isValidFamilyMember(request.auth.uid) &&
                       request.auth.uid == request.resource.data.senderId;
      allow update, delete: if request.auth.uid != null && 
                               request.auth.uid == resource.data.senderId;
    }
    
    // PRIVATE_MESSAGES - yalnız göndərən və alan
    match /private_messages/{messageId} {
      allow read: if request.auth.uid != null && 
                     (request.auth.uid == resource.data.senderId || 
                      request.auth.uid == resource.data.receiverId);
      allow create: if request.auth.uid != null && 
                       request.auth.uid == request.resource.data.senderId;
      allow update, delete: if request.auth.uid != null && 
                               request.auth.uid == resource.data.senderId;
    }
    
    // FAMILY_PHOTOS - yalnız ailə üzvləri
    match /family_photos/{photoId} {
      allow read: if request.auth.uid != null && 
                     isValidFamilyMember(request.auth.uid);
      allow create: if request.auth.uid != null && 
                       isValidFamilyMember(request.auth.uid) &&
                       request.auth.uid == request.resource.data.uploaderId;
      allow update, delete: if request.auth.uid != null && 
                               (request.auth.uid == resource.data.uploaderId ||
                                isAdmin(request.auth.uid));
    }
    
    // SOS_ALERTS - ailə üzvləri oxuya bilər, yalnız göndərən yarada bilər
    match /sos_alerts/{alertId} {
      allow read: if request.auth.uid != null && 
                     isValidFamilyMember(request.auth.uid);
      allow create: if request.auth.uid != null && 
                       isValidFamilyMember(request.auth.uid) &&
                       request.auth.uid == request.resource.data.senderId;
      allow update: if request.auth.uid != null && 
                       isAdmin(request.auth.uid);
    }
    
    // USER_SESSIONS - yalnız öz sessiyalarını idarə edə bilər
    match /user_sessions/{sessionId} {
      allow read, write: if request.auth.uid != null && 
                            request.auth.uid == resource.data.userId;
    }
    
    // FAMILY_SETTINGS - yalnız admin dəyişə bilər
    match /family_settings/{settingId} {
      allow read: if request.auth.uid != null && 
                     isValidFamilyMember(request.auth.uid);
      allow write: if request.auth.uid != null && 
                      isAdmin(request.auth.uid);
    }
    
    // Helper functions
    function isValidFamilyMember(uid) {
      return uid in get(/databases/$(database)/documents/family_config/members).data.allowedMembers;
    }
    
    function isAdmin(uid) {
      let memberData = get(/databases/$(database)/documents/family_config/members).data;
      return uid in memberData.allowedMembers && 
             memberData.allowedMembers[uid].role == 'admin';
    }
    
    function isMessageParticipant(uid, senderId, receiverId) {
      return uid == senderId || uid == receiverId;
    }
  }
}`;

import InviteOnlyAuth, { FAMILY_ALLOWLIST } from './InviteOnlyAuth';
export class DatabaseRules {
  // Müvəqqəti yaddaş üçün DB qaydaları (Firebase olmayan hallar üçün)
  private static allowedOperations: Map<string, Set<string>> = new Map();
  
  // İstifadəçinin müəyyən kolleksiyaya girişinin yoxlanması
  static checkAccess(
    userId: string, 
    collection: string, 
    operation: 'read' | 'write' | 'create' | 'update' | 'delete',
    resourceOwnerId?: string
  ): boolean {
    
    // Default DENY
    let access = false;
    
    switch (collection) {
      case 'users':
        access = userId === resourceOwnerId;
        break;
        
      case 'family_messages':
        access = this.isValidFamilyMember(userId);
        if (operation === 'create' || operation === 'update' || operation === 'delete') {
          access = access && userId === resourceOwnerId;
        }
        break;
        
      case 'private_messages':
        // Yalnız göndərən və ya alan oxuya bilər
        access = userId === resourceOwnerId; // resourceOwnerId burada senderId və ya receiverId ola bilər
        break;
        
      case 'family_photos':
        access = this.isValidFamilyMember(userId);
        if (operation === 'create' || operation === 'update' || operation === 'delete') {
          access = access && (userId === resourceOwnerId || this.isAdmin(userId));
        }
        break;
        
      case 'sos_alerts':
        access = this.isValidFamilyMember(userId);
        if (operation === 'create') {
          access = access && userId === resourceOwnerId;
        }
        break;
        
      case 'user_sessions':
        access = userId === resourceOwnerId;
        break;
        
      case 'family_settings':
        if (operation === 'read') {
          access = this.isValidFamilyMember(userId);
        } else {
          access = this.isAdmin(userId);
        }
        break;
        
      default:
        access = false; // Default DENY
    }
    
    // Loq qeydiyyatı (metadata)
    if (!access) {
      console.warn(`🚫 Access denied: User ${userId} attempted ${operation} on ${collection}`);
    }
    
    return access;
  }
  
  // Ailə üzvü yoxlaması (gerçək implementasiyada DB-dən yoxlanacaq)
  private static isValidFamilyMember(userId: string): boolean {
    // Bu gerçək implementasiyada database-dən yoxlanacaq
    return FAMILY_ALLOWLIST.some(user => user.uid === userId && user.isActive);
  }
  
  // Admin yoxlaması
  private static isAdmin(userId: string): boolean {
    const user = FAMILY_ALLOWLIST.find(user => user.uid === userId);
    return user?.role === 'admin' || false;
  }
  
  // Kolleksiya üçün icazəli əməliyyatları qeyd et
  static logOperation(userId: string, collection: string, operation: string): void {
    const key = `${userId}_${collection}`;
    if (!this.allowedOperations.has(key)) {
      this.allowedOperations.set(key, new Set());
    }
    this.allowedOperations.get(key)?.add(operation);
  }
}

export default DatabaseRules;
