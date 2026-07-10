/**
 * Public API ของ location-sharing feature
 *
 * ครอบ production flow แชร์ตำแหน่งเหตุจาก mobile tracking: โหลด channel availability,
 * สร้างข้อความ/แผนที่, validate เบอร์ และบันทึก share attempt กลับ API.
 */
export {
  buildIncidentShareAttemptUrl,
  buildIncidentShareCopyMessage,
  buildIncidentShareMapsUrl,
  buildShareChannelsUrl,
  detectMobilePlatform,
  isValidThaiReporterPhone,
  shouldCopyMessageBeforeOpeningChannel,
  type IncidentShareAttemptResponse,
  type IncidentShareChannel,
  type IncidentShareSnapshot,
  type MobileSharePlatform,
  type ShareChannelAvailability,
} from './lib/incident-location-share'

export { IncidentLocationShareCard } from './ui/incident-location-share-card'
