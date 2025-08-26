require('dotenv').config();
import axios from 'axios';
import { channel } from 'diagnostics_channel';
import { customAlphabet } from 'nanoid'

interface SendSmsOptions {
  to: string;
  message: string;
}

interface UserDetails {
  msisdn: string;
  subscriptionPlan: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export async function sendSms({ to, message }: SendSmsOptions) {
  const PISIMOB_BASEURL = process.env.PISIMOB_BASEURL || 'https://api.pisimobile.net';
  const PISISID = process.env.PISISID || '247';

  axios.defaults.headers.common['Content-Type'] = 'String';
  axios.defaults.headers.common['vaspid'] = process.env.VASPID || '2';
  // Dynamically set the authorization token later from function, cause it might change
  axios.defaults.headers.common['pisi-authorization-token'] = `Bearer ${process.env.PISI_AUTHORIZATION_TOKEN}`;

  const payload = {
    pisisid: PISISID,
    msisdn: to, // Assuming 'to' is the MSISDN (phone number) 
    to,
    message,
    trxid: generateTrxId(), // Generate a unique transaction ID
  };

  try {
    const response = await axios.post(`${PISIMOB_BASEURL}/v1/sms/outbound/send`, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

export async function subscribeUser({ msisdn, subscriptionPlan }: UserDetails) {
  const PISIMOB_BASEURL = process.env.PISIMOB_BASEURL || 'https://api.pisimobile.net';
  const PISIPID = process.env.PISIPID || '287'; // Weekly = 288; Monthly = 289

  axios.defaults.headers.common['Content-Type'] = 'String';
  axios.defaults.headers.common['vaspid'] = process.env.VASPID || '2';
  // Dynamically set the authorization token later from function, cause it might change
  axios.defaults.headers.common['pisi-authorization-token'] = `Bearer ${process.env.PISI_AUTHORIZATION_TOKEN}`;

  const payload = {
    pisipid: PISIPID,
    msisdn,
    channel: 'SMS',
    subscriptionPlan,
    trxid: generateTrxId(), // Generate a unique transaction ID
  };

  const maxAttempts = Number(process.env.PISI_RETRY_MAX_ATTEMPTS) || 5;
  const baseDelayMs = Number(process.env.PISI_RETRY_BASE_DELAY_MS) || 500;
  const maxDelayMs = Number(process.env.PISI_RETRY_MAX_DELAY_MS) || 5000;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const computeDelay = (attempt: number) => {
    const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
    const jitter = Math.floor(Math.random() * 100);
    return exp + jitter;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        `${PISIMOB_BASEURL}/v1/subscription/outbound/create`,
        payload,
        { timeout: 10000 },
      );

      const data = response?.data;
      if (data && data.success === true) {
        return data;
      }

      const nonSuccessMessage = data?.message || data?.error || 'Subscription request did not succeed';
      if (attempt < maxAttempts) {
        await sleep(computeDelay(attempt));
        continue;
      }
      throw new Error(nonSuccessMessage);
    } catch (error: any) {
      const status = error?.response?.status;
      const isRetryable = !status || status >= 500 || status === 429 || status === 408;
      if (isRetryable && attempt < maxAttempts) {
        await sleep(computeDelay(attempt));
        continue;
      }

      const message = error?.response?.data?.message || error.message || 'Subscription request failed';
      throw new Error(
        `Failed to subscribe user after ${attempt} ${attempt === 1 ? 'attempt' : 'attempts'}: ${message}`,
      );
    }
  }

  throw new Error('Unexpected error while subscribing user');
}

function generateTrxId() {
  // Generate a unique transaction ID, e.g., using a timestamp or UUID
  const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)
  return `brain-teaser_${nanoid(5)}${Date.now()}`;
}

export async function subscribeListener(callbackUrl: string) {
  // register a handler/callback URL in order to receive Mobile Originated messages from Subscribers
  const PISIMOB_BASEURL = process.env.PISIMOB_BASEURL
  const PISIPID = process.env.PISIPID

  axios.defaults.headers.common['Content-Type'] = 'String';
  axios.defaults.headers.common['vaspid'] = process.env.VASPID || '2';
  // Dynamically set the authorization token later from function, cause it might change
  axios.defaults.headers.common['pisi-authorization-token'] = `Bearer ${process.env.PISI_AUTHORIZATION_TOKEN}`;

  const payload = {
    pisipid: PISIPID,
    notifyUrl: callbackUrl, // url that will be called by pisi
    method: "POST",
    type: "MO",  // MO or DLR
    trxid: generateTrxId(), // Generate a unique transaction ID
  };

  try {
    const response = await axios.post(`${PISIMOB_BASEURL}/v1/sms/inbound/subscribe`, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

export async function deleteListener(callbackUrl: string, trxid: string) {
  // delete a handler/callback URL in PISI in order to register a new one
  const PISIMOB_BASEURL = process.env.PISIMOB_BASEURL
  const PISIPID = process.env.PISIPID

  axios.defaults.headers.common['Content-Type'] = 'String';
  axios.defaults.headers.common['vaspid'] = process.env.VASPID || '2';
  // Dynamically set the authorization token later from function, cause it might change
  axios.defaults.headers.common['pisi-authorization-token'] = `Bearer ${process.env.PISI_AUTHORIZATION_TOKEN}`;

  const payload = {
    pisipid: PISIPID,
    notifyUrl: callbackUrl, // url that will be called by pisi
    method: "POST",
    type: "MO",  // MO or DLR
    trxid
  };

  try {
    const response = await axios.post(`${PISIMOB_BASEURL}/v1/sms/inbound/delete`, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message);
  }
}

export async function chargeUser({ msisdn, subscriptionPlan }: UserDetails) {
  const PISIMOB_BASEURL = process.env.PISIMOB_BASEURL || 'https://api.pisimobile.net';
  const PISIPID = process.env.PISIPID || '287';

  axios.defaults.headers.common['Content-Type'] = 'String';
  axios.defaults.headers.common['vaspid'] = process.env.VASPID || '2';
  axios.defaults.headers.common['pisi-authorization-token'] = `Bearer ${process.env.PISI_AUTHORIZATION_TOKEN}`;

  const payload = {
    pisipid: PISIPID,
    msisdn,
    channel: 'SMS',
    subscriptionPlan,
    trxid: generateTrxId(),
  };

  const maxAttempts = Number(process.env.PISI_RETRY_MAX_ATTEMPTS) || 5;
  const baseDelayMs = Number(process.env.PISI_RETRY_BASE_DELAY_MS) || 500;
  const maxDelayMs = Number(process.env.PISI_RETRY_MAX_DELAY_MS) || 5000;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const computeDelay = (attempt: number) => {
    const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
    const jitter = Math.floor(Math.random() * 100);
    return exp + jitter;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.post(
        `${PISIMOB_BASEURL}/v1/charge/outbound/create`,
        payload,
        { timeout: 10000 },
      );

      const data = response?.data;
      if (data && data.success === true) {
        return data;
      }

      const nonSuccessMessage = data?.message || data?.error || 'Charge request did not succeed';
      if (attempt < maxAttempts) {
        await sleep(computeDelay(attempt));
        continue;
      }
      throw new Error(nonSuccessMessage);
    } catch (error: any) {
      const status = error?.response?.status;
      const isRetryable = !status || status >= 500 || status === 429 || status === 408;
      if (isRetryable && attempt < maxAttempts) {
        await sleep(computeDelay(attempt));
        continue;
      }

      const message = error?.response?.data?.message || error.message || 'Charge request failed';
      throw new Error(
        `Failed to charge user after ${attempt} ${attempt === 1 ? 'attempt' : 'attempts'}: ${message}`,
      );
    }
  }

  throw new Error('Unexpected error while charging user');
}
/*
Just stashing this to show how an axios request with auth might look like
const auth = {
    username: USERNAME,
    password: PASSWORD,
  };
const response = await axios.post(`${PISIMOB_BASEURL}/v1/sms/outbound/send`, payload, { auth });
*/