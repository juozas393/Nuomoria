// Meter collection and notification system utilities

import { supabase } from '../lib/supabase';

export interface CollectionRequest {
  id: string;
  addressId: string;
  tenantId: string;
  month: string;
  requestedMeters: Array<{
    meterId: string;
    title: string;
    unit: string;
    photoRequired: boolean;
  }>;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

export interface MeterReadingWithPhoto {
  id: string;
  meterId: string;
  propertyId: string;
  reading: number;
  date: string;
  photoUrl?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

/**
 * Creates collection requests for all tenants at a specific address
 * for meters that require photos
 */
export async function createCollectionRequestsForAddress(
  addressId: string,
  month: string = new Date().toISOString().slice(0, 7) // YYYY-MM format
): Promise<CollectionRequest[]> {
  try {
    // Get all properties (apartments) at this address
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, tenant_id')
      .eq('address_id', addressId)
      .not('tenant_id', 'is', null);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      throw propertiesError;
    }

    // Get meters that require photos for this address
    const { data: meters, error: metersError } = await supabase
      .from('address_meters')
      .select('id, title, unit, photo_required')
      .eq('address_id', addressId)
      .eq('photo_required', true)
      .eq('is_active', true);

    if (metersError) {
      console.error('Error fetching meters:', metersError);
      throw metersError;
    }

    const requests: CollectionRequest[] = [];

    // Create requests for each tenant
    for (const property of properties) {
      if (!property.tenant_id) continue;

      const request: CollectionRequest = {
        id: `req_${Date.now()}_${property.id}`,
        addressId,
        tenantId: property.tenant_id,
        month,
        requestedMeters: meters.map(meter => ({
          meterId: meter.id,
          title: meter.title,
          unit: meter.unit,
          photoRequired: true
        })),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      requests.push(request);
    }

    // Here you would typically save these requests to the database
    // For now, we'll just return them
    
    return requests;
  } catch (error) {
    console.error('Error creating collection requests:', error);
    throw error;
  }
}

/**
 * Gets meter readings with photos for a specific address
 */
export async function getMeterReadingsWithPhotos(
  addressId: string,
  month?: string
): Promise<MeterReadingWithPhoto[]> {
  try {
    // First get all properties for this address
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id')
      .eq('address_id', addressId);

    if (propertiesError) {
      console.error('Error fetching properties for address:', propertiesError);
      throw propertiesError;
    }

    if (!properties || properties.length === 0) {
      console.log('No properties found for address:', addressId);
      return [];
    }

    const propertyIds = properties.map(p => p.id);

    // Then get meter readings for these properties
    let query = supabase
      .from('meter_readings')
      .select(`
        id,
        meter_id,
        property_id,
        reading,
        date,
        photo_url,
        status,
        created_at
      `)
      .in('property_id', propertyIds);

    if (month) {
      query = query.gte('date', `${month}-01`).lt('date', `${month}-32`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meter readings with photos:', error);
      throw error;
    }

    // Filter out readings without photos on the client side
    const readingsWithPhotos = data?.filter(reading => reading.photo_url) || [];

    return readingsWithPhotos.map(reading => ({
      id: reading.id,
      meterId: reading.meter_id,
      propertyId: reading.property_id,
      reading: reading.reading,
      date: reading.date,
      photoUrl: reading.photo_url,
      status: reading.status,
      createdAt: reading.created_at
    }));
  } catch (error) {
    console.error('Error getting meter readings with photos:', error);
    throw error;
  }
}

/**
 * Sends notification to tenant about meter reading request
 */
export async function sendMeterReadingNotification(
  tenantId: string,
  addressId: string,
  requestedMeters: Array<{ title: string; unit: string }>
): Promise<void> {
  try {
    // This would typically integrate with your notification system
    // For now, we'll just handle the notification silently

    // Here you would:
    // 1. Send email/SMS notification
    // 2. Create in-app notification
    // 3. Update notification history
  } catch (error) {
    console.error('Error sending meter reading notification:', error);
    throw error;
  }
}
