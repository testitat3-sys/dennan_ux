import json


def extract_unique_brands(input_file_path, output_file_path):
    try:
        # Open and load the JSON file
        with open(input_file_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        # Ensure the root element is a list
        if not isinstance(data, list):
            print("Error: The JSON file root must be a list of objects.")
            return

        # Use a set to automatically handle uniqueness
        unique_brands = set()

        for item in data:
            # Check if it's a dictionary and contains the "brand" key
            if isinstance(item, dict) and "brand" in item:
                brand_name = item["brand"]
                # Optional: clean up whitespace or ignore empty strings
                if isinstance(brand_name, str) and brand_name.strip():
                    unique_brands.add(brand_name.strip())

        # Convert back to a sorted list for cleaner output
        sorted_brands = sorted(list(unique_brands))

        # Save the unique list back to a JSON file
        with open(output_file_path, "w", encoding="utf-8") as file:
            json.dump(sorted_brands, file, indent=4)

        print(
            f"Successfully saved {len(sorted_brands)} unique brands to {output_file_path}"
        )

    except FileNotFoundError:
        print(f"Error: The file {input_file_path} was not found.")
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON. Check if the file is well-formatted.")


# Example usage:
extract_unique_brands('products_store.json', 'unique_brands.json')