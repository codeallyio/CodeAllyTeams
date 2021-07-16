#!/bin/bash

echo "START"

check=$(find /home/strove/project -type f -name 'permissions.txt')
echo "check - $check"

# Check if string is empty
if [ -z "$check" ]
then
    printf "it failed\n"
else
    printf "it succeeded\n"

    # read line after line 
    while IFS= read -r line; do
    echo "linijka - $line"
    output=$(find -name $line)
    echo "output - $output"
    chmod 755 $output
done < permissions.txt
fi

echo "END"
