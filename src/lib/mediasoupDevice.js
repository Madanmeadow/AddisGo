// src/lib/mediasoupDevice.js
import { Device } from "mediasoup-client";

export async function createLoadedDevice(routerRtpCapabilities) {
  const device = new Device();
  await device.load({ routerRtpCapabilities });
  return device;
}