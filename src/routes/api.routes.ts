import { Router, Request, Response } from 'express';
import { getIndexScrip, getLtpData } from '../helpers/apiService';
import { setCred } from '../helpers/functions';
import { ALGO } from '../helpers/constants';

const router = Router();

router.post('/getVix', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', { timeZone: 'Asia/Kolkata' });
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
export default router;
