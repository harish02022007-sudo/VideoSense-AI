import numpy as np

path = "storage/embeddings/0e99847a-83b1-4104-9a3d-abbb264e2d03/FRAME.npy"

data = np.load(path)

print("Shape:", data.shape)
print("Dtype:", data.dtype)

print("\nFirst vector:")
print(data[0][:10])

print("\nFirst vector norm:")
print(np.linalg.norm(data[0]))

print("\nZero vectors:")
print(np.sum(np.linalg.norm(data, axis=1) == 0))