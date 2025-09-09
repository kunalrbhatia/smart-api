import { Router, Request, Response } from 'express';
import { getIndexScrip, getLtpData } from '../helpers/apiService';
import { setCred } from '../helpers/functions';
import { ALGO } from '../helpers/constants';
import { INDICES } from 'krb-smart-api-module';

const router = Router();

router.post('/getVix', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const indiaVix = await getIndexScrip({ scriptName: 'INDIA VIX' });
    const indiaVixLtp = await getLtpData({
      exchange: indiaVix[0].exch_seg,
      symboltoken: indiaVix[0].token,
      tradingsymbol: indiaVix[0].symbol,
    });
    res.status(200).json({ data: indiaVixLtp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
router.post('/getNifty', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const data = await getIndexScrip({ scriptName: INDICES.NIFTY });
    const ltpData = await getLtpData({
      exchange: data[0].exch_seg,
      symboltoken: data[0].token,
      tradingsymbol: data[0].symbol,
    });
    res.status(200).json({ data: ltpData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
router.post('/getBankNifty', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const data = await getIndexScrip({ scriptName: INDICES.BANKNIFTY });
    const ltpData = await getLtpData({
      exchange: data[0].exch_seg,
      symboltoken: data[0].token,
      tradingsymbol: data[0].symbol,
    });
    res.status(200).json({ data: ltpData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});
router.post('/getSensex', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);
    setCred(req);
    const data = await getIndexScrip({ scriptName: INDICES.SENSEX });
    const ltpData = await getLtpData({
      exchange: data[0].exch_seg,
      symboltoken: data[0].token,
      tradingsymbol: data[0].symbol,
    });
    res.status(200).json({ data: ltpData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});

export default router;
