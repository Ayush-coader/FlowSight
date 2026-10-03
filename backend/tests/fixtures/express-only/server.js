const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/orders', async (req, res) => {
  const { itemId, quantity, userToken } = req.body;
  const order = await Order.create({ itemId, quantity });
  res.json({ success: true, orderId: order.id });
});

app.listen(5000);