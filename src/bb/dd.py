from flask import Flask, jsonify
import json
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes and all origins
CORS(app)  # This will allow CORS for all routes

@app.route('/geojsondata')
def get_geojson():
    # Open the GeoJSON file and load the data
    try:
        with open('data.geojson', 'r') as file:
            geojson_data = json.load(file)  # Load the data from the file
        return jsonify(geojson_data)  # Return the data as JSON
    except Exception as e:
        # Handle errors if the file is not found or other issues occur
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
