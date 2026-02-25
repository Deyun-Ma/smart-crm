const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

const summary = require('./summary');
const { calculateClientScore, calculateAllScores } = require('@/services/clientScoringService');

function modelController() {
  const Model = mongoose.model('Client');
  const methods = createCRUDController('Client');

  methods.summary = (req, res) => summary(Model, req, res);

  methods.calculateScore = async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Client ID required',
      });
    }
    try {
      const score = await calculateClientScore(id);
      if (!score) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'Client not found',
        });
      }
      return res.status(200).json({
        success: true,
        result: score,
        message: 'Score calculated successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  methods.calculateAllScores = async (req, res) => {
    try {
      const results = await calculateAllScores();
      return res.status(200).json({
        success: true,
        result: results,
        message: 'All scores calculated successfully',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        result: null,
        message: error.message,
      });
    }
  };

  return methods;
}

module.exports = modelController();
