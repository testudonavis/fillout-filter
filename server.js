const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

const BASE_URL = 'https://api.fillout.com';

/* FilterClauses
type FilterClauseType = {
	id: string;
	condition: 'equals' | 'does_not_equal' | 'greater_than' | 'less_than';
	value: number | string;
}

// each of these filters should be applied like an AND in a "where" clause
// in SQL
type ResponseFiltersType = ResponseFilter[];
*/

function isValidDate(date) {
  if (
    !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(
      date
    )
  ) {
    return false;
  }
  return date instanceof Date && !Number.isNaN(date);
}

function isNumber(value) {
  return typeof value === 'number';
}

function meetsCondition(value1, value2, condition, isDate = false) {
  // check if values are date
  if (!isDate) {
    const date1 = new Date(value1);
    if (isValidDate(date1)) {
      const date2 = new Date(value2);
      return meetsCondition(date1, date2, condition, true);
    }
  }

  // check if values are num
  let parsedValue2 = value2;
  if (isNumber(value1)) {
    parsedValue2 = parseFloat(value2);
  }

  // evaluate condition
  switch (condition) {
    case 'equals':
      if (isDate) {
        return +value1 === +value2;
      }
      return value1 === parsedValue2;
    case 'does_not_equal':
      if (isDate) {
        return +value1 !== +value2;
      }
      return value1 !== parsedValue2;
    case 'greater_than':
      return parsedValue2 > value1;
    case 'less_than':
      return parsedValue2 < value1;
    default:
      throw new Error('Unknown condition');
  }
}

// Filter endpoint
app.get('/:formId/filteredResponses', async (req, res) => {
  const accessToken = process.env.ACCESS_TOKEN;
  const { formId } = req.params;
  const { filters } = req.query;

  if (!filters) {
    return res.status(400).json('Please supply filters param.');
  }

  try {
    const parsedFilters = JSON.parse(decodeURIComponent(filters));
    const response = await axios.get(
      `${BASE_URL}/v1/api/forms/${formId}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: req.query,
      }
    );
    const responseData = response.data;
    const { responses } = responseData;

    const flaggedIds = new Set();
    for (let j = 0; j < responses.length; j += 1) {
      const { submissionId, questions } = responses[j];
      let filtered = false;
      for (let i = 0; i < parsedFilters.length; i += 1) {
        if (filtered) {
          break;
        }
        const {
          id: filterId,
          condition: filterCondition,
          value: filterValue,
        } = parsedFilters[i];
        for (let k = 0; k < questions.length; k += 1) {
          const { id: questionId, value: questionValue } = questions[k];
          if (
            questionId === filterId &&
            !meetsCondition(filterValue, questionValue, filterCondition)
          ) {
            flaggedIds.add(submissionId);
            filtered = true;
            break;
          }
        }
      }
    }

    const filteredResponses = responses.filter(
      (submission) => !flaggedIds.has(submission.submissionId)
    );

    responseData.responses = filteredResponses;
    responseData.totalResponses = filteredResponses.length;

    return res.json(responseData);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
