import sys


def findMin(array, n):

    sum = 0
    for i in range(n):
        sum += array[i]
    print(sum)
    subsetSum = sum//2

    #initialize dp
    dp = [[0 for i in range(n+1)] for j in range(subsetSum+1)]
    #base case
    for i in range(0, subsetSum +1):
        dp[i][n] = subsetSum - i
    print(dp)

    # left = []
    # right = []
    min = float('inf')
    for t in range(0, subsetSum+1):
        for i in range(n-1, -1, -1):
            min = dp[t][i+1]
            if dp[t-array[i]][i+1] < min:
                #if t == subsetSum:
                    # left.append(array[i])
                min = dp[t-array[i]][i+1]
            # else:
            #     if t == subsetSum:
            #         right.append(array[i])
            dp[t][i] = min
            print(dp)

    print(dp)
    #print(left, right)
    return
#Driver code

array = [3,6,5]
n = len(array)
print("The min difference is", findMin(array, n))