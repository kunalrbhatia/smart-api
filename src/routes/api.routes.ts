import { Router, Request, Response } from 'express';
import { getIndexScrip, getLtpData } from '../helpers/apiService';
import { setCred } from '../helpers/functions';
import { ALGO } from '../helpers/constants';
import { INDICES } from 'krb-smart-api-module';

const router = Router();

router.post('/getAllIndices', async (req: Request, res: Response) => {
  console.log(`\n${ALGO}: ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`);
  try {
    const istTz = new Date().toLocaleString('default', {
      timeZone: 'Asia/Kolkata',
    });
    console.log(`${ALGO}: time, ${istTz}`);

    setCred(req);

    const indexMap: Record<string, string> = {
      VIX: 'INDIA VIX',
      NIFTY: INDICES.NIFTY,
      BANKNIFTY: INDICES.BANKNIFTY,
      SENSEX: INDICES.SENSEX,
    };

    // Run all fetches in parallel
    const results = await Promise.all(
      Object.entries(indexMap).map(async ([key, scriptName]) => {
        try {
          const data = await getIndexScrip({ scriptName });
          if (!data || data.length === 0) {
            return { index: key, error: 'No data found' };
          }

          const ltpData = await getLtpData({
            exchange: data[0].exch_seg,
            symboltoken: data[0].token,
            tradingsymbol: data[0].symbol,
          });

          return { index: key, data: ltpData };
        } catch (err) {
          console.error(`${ALGO}: error fetching ${key}`, err);
          return { index: key, error: 'Failed to fetch data' };
        }
      })
    );

    // Convert to object for easier frontend usage
    const responseData = results.reduce((acc, curr) => {
      acc[curr.index] = curr.data || { error: curr.error };
      return acc;
    }, {} as Record<string, any>);

    res.status(200).json({ data: responseData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ response: err });
  }
  console.log(`${ALGO}: -----------------------------------`);
});


export default router;
