import { userApi } from '../lib/userApi';
import { addressApi } from '../lib/database';

/**
 * Setup demo user-address relationships
 * This function assigns users to addresses if they don't have any
 */
export async function setupDemoUserAddresses(userId: string, userEmail: string): Promise<void> {
  try {
    // Check if user already has addresses
    const existingAddresses = await userApi.getUserAddresses(userId);
    
    if (existingAddresses.length > 0) {
      console.log('User already has addresses assigned:', existingAddresses.length);
      return;
    }

    // Get all addresses
    const allAddresses = await addressApi.getAll();
    
    if (allAddresses.length === 0) {
      console.log('No addresses found in database');
      return;
    }

    // Assign addresses based on user email/role
    let addressesToAssign: { addressId: string; role: 'landlord' | 'tenant' | 'property_manager' | 'maintenance' }[] = [];

    if (userEmail.includes('admin')) {
      // Admin gets all addresses as landlord
      addressesToAssign = allAddresses.map(addr => ({ 
        addressId: addr.id, 
        role: 'landlord' as const 
      }));
    } else if (userEmail.includes('nuomotojas')) {
      // Landlord gets first 2 addresses
      addressesToAssign = allAddresses.slice(0, 2).map(addr => ({ 
        addressId: addr.id, 
        role: 'landlord' as const 
      }));
    } else if (userEmail.includes('vadovas')) {
      // Property manager gets first address
      addressesToAssign = allAddresses.slice(0, 1).map(addr => ({ 
        addressId: addr.id, 
        role: 'property_manager' as const 
      }));
    } else if (userEmail.includes('remontas')) {
      // Maintenance gets all addresses
      addressesToAssign = allAddresses.map(addr => ({ 
        addressId: addr.id, 
        role: 'maintenance' as const 
      }));
    } else {
      // Regular users (tenants) get first address as tenant
      addressesToAssign = allAddresses.slice(0, 1).map(addr => ({ 
        addressId: addr.id, 
        role: 'tenant' as const 
      }));
    }

    // Assign addresses
    for (const assignment of addressesToAssign) {
      try {
        await userApi.addUserToAddress(userId, assignment.addressId, assignment.role);
        console.log(`Assigned ${userEmail} to address ${assignment.addressId} as ${assignment.role}`);
      } catch (error) {
        console.warn(`Failed to assign address ${assignment.addressId}:`, error);
      }
    }

    console.log(`Successfully assigned ${addressesToAssign.length} addresses to ${userEmail}`);
  } catch (error) {
    console.error('Error setting up demo user addresses:', error);
  }
}
