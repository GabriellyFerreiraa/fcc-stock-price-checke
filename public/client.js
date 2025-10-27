document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('testForm');
    const resultDiv = document.getElementById('jsonResult');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const stockInput = document.getElementById('stock_input').value.trim();
        const likeChecked = document.getElementById('like_checkbox').checked;

        // Limpiar el resultado
        resultDiv.textContent = 'Loading...';

        // Procesar las acciones (separadas por coma)
        const stocks = stockInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
        
        if (stocks.length === 0) {
            resultDiv.textContent = 'Error: Please enter at least one stock symbol.';
            return;
        }

        // Construir la URL de la API
        let url = '/api/stock-prices?';
        
        if (stocks.length === 1) {
            url += `stock=${stocks[0]}`;
        } else if (stocks.length === 2) {
            url += `stock=${stocks[0]}&stock=${stocks[1]}`;
        } else {
            resultDiv.textContent = 'Error: Please enter one or two stock symbols.';
            return;
        }
        
        if (likeChecked) {
            url += '&like=true';
        }

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Mostrar el resultado JSON formateado
            resultDiv.textContent = JSON.stringify(data, null, 2);

        } catch (error) {
            resultDiv.textContent = `Error fetching data: ${error.message}`;
        }
    });
});
