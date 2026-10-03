import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export function CheckoutPage() {
  const [cardDetails, setCardDetails] = useState('');
  const navigate = useNavigate();

  const handleCheckout = async (e) => {
    e.preventDefault();
    const res = await axios.post('/api/checkout', { cardDetails });
    if (res.data.success) {
      navigate('/order-confirmed');
    }
  };

  return (
    <div>
      <h1>Checkout</h1>
      <button onClick={handleCheckout}>Pay</button>
    </div>
  );
}