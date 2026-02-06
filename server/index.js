import express from 'express';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AddisGo API',
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
