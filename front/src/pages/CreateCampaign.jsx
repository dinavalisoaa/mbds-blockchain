@ -1,5 +1,5 @@
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { txCreateCampaign } from '../services/transactions.js';
import { uploadToPinata } from '../services/pinata.js';
import { useTx } from '../hooks/useTx.js';
@ -24,9 +24,12 @@ export default function CreateCampaign({ wallet }) {
  const runTx = useTx();
  const { add: addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef();

  const [fields,     setFields]     = useState(EMPTY);
  const prefill = location.state?.prefill;

  const [fields,     setFields]     = useState(prefill ? { ...EMPTY, ...prefill } : EMPTY);
  const [imageFile,  setImageFile]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(false);
@ -102,11 +105,17 @@ export default function CreateCampaign({ wallet }) {
        <div className="detail-left">
          <div className="detail-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <h1 className="detail-panel-title">INITIALIZE_CAMPAIGN</h1>
              <span className="badge active">NEW</span>
              <h1 className="detail-panel-title">
                {prefill ? 'REDEPLOY_CAMPAIGN' : 'INITIALIZE_CAMPAIGN'}
              </h1>
              <span className={`badge ${prefill ? 'cancelled' : 'active'}`}>
                {prefill ? 'EDIT' : 'NEW'}
              </span>
            </div>
            <p className="detail-panel-subtitle">
              Deploy new crowdfunding smart contract on Sepolia Testnet.
              {prefill
                ? 'Editing a cancelled campaign. A new contract will be deployed with the updated parameters.'
                : 'Deploy new crowdfunding smart contract on Sepolia Testnet.'}
            </p>
          </div>

